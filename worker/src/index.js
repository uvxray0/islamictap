const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data, status = 200) {
  return Response.json(data, { status, headers: cors });
}

async function verifyInitData(initData, botToken) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.importKey(
    "raw", encoder.encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const secret = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(botToken));

  const hmacKey = await crypto.subtle.importKey(
    "raw", secret,
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", hmacKey, encoder.encode(dataCheckString));
  const computed = [...new Uint8Array(signature)]
    .map((b) => b.toString(16).padStart(2, "0")).join("");

  if (computed !== hash) return null;

  const userJson = params.get("user");
  return userJson ? JSON.parse(userJson) : null;
}

async function getUserFromToken(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "");
  if (!token) return null;

  const row = await env.DB.prepare(
    "SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?"
  ).bind(token, Date.now()).first();

  return row ? row.user_id : null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    if (url.pathname === "/api/auth" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const user = await verifyInitData(body.initData || "", env.BOT_TOKEN);
      if (!user) return json({ error: "invalid init data" }, 401);

      await env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?")
        .bind(Date.now()).run();

      const token = crypto.randomUUID();
      const expiresAt = Date.now() + 1000 * 60 * 60 * 72;

      await env.DB.prepare(
        "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)"
      ).bind(token, user.id, expiresAt).run();

      await env.DB.prepare(
        "INSERT INTO users (id) VALUES (?) ON CONFLICT(id) DO NOTHING"
      ).bind(user.id).run();

      return json({ token, user: { id: user.id, first_name: user.first_name } });
    }

    const userId = await getUserFromToken(request, env);
    if (!userId) return json({ error: "unauthorized" }, 401);

    if (url.pathname === "/api/me") {
      const row = await env.DB.prepare(
        "SELECT id, score, created_at FROM users WHERE id = ?"
      ).bind(userId).first();
      return json(row || { id: userId, score: 0 });
    }

    if (url.pathname === "/api/tap" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const count = Math.min(Math.max(Number(body.count) || 1, 1), 1000);

      await env.DB.prepare(
        `INSERT INTO users (id, score) VALUES (?, ?)
         ON CONFLICT(id) DO UPDATE SET score = score + ?`
      ).bind(userId, count, count).run();

      const row = await env.DB.prepare(
        "SELECT score FROM users WHERE id = ?"
      ).bind(userId).first();

      return json({ id: userId, score: row.score });
    }

    return json({ error: "not found" }, 404);
  },
};