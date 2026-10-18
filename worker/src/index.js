const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const MAX_FOOD = 500;
const FOOD_REGEN = 2;
const FOOD_REGEN_INTERVAL = 1000;

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

function calcFood(currentFood, lastRegen) {
  const now = Math.floor(Date.now() / 1000);
  const elapsed = now - lastRegen;
  const regen = Math.floor((elapsed * FOOD_REGEN) / (FOOD_REGEN_INTERVAL / 1000));
  const newFood = Math.min(currentFood + regen, MAX_FOOD);
  return { food: newFood, lastRegen: now };
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

      const existing = await env.DB.prepare(
        "SELECT token FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY expires_at DESC LIMIT 1"
      ).bind(user.id, Date.now()).first();

      if (existing) {
        await env.DB.prepare(
          "UPDATE users SET username = ? WHERE id = ?"
        ).bind(user.username || "", user.id).run();
        return json({ token: existing.token, user: { id: user.id, first_name: user.first_name } });
      }

      const token = crypto.randomUUID();
      const expiresAt = Date.now() + 1000 * 60 * 60 * 72;

      await env.DB.prepare(
        "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)"
      ).bind(token, user.id, expiresAt).run();

      await env.DB.prepare(
        "INSERT INTO users (id, username) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET username = ?"
      ).bind(user.id, user.username || "", user.username || "").run();

      return json({ token, user: { id: user.id, first_name: user.first_name } });
    }

    if (url.pathname === "/api/leaderboard") {
      const rows = await env.DB.prepare(
        "SELECT id, username, score FROM users ORDER BY score DESC LIMIT 10"
      ).all();

      return json({ top: rows.results });
    }

    const userId = await getUserFromToken(request, env);
    if (!userId) return json({ error: "unauthorized" }, 401);

    if (url.pathname === "/api/me") {
      const row = await env.DB.prepare(
        "SELECT id, username, score, food, last_regen, created_at FROM users WHERE id = ?"
      ).bind(userId).first();

      if (!row) return json({ id: userId, score: 0, food: MAX_FOOD });

      const { food } = calcFood(row.food, row.last_regen);
      return json({ ...row, food });
    }

    if (url.pathname === "/api/tap" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const count = Math.min(Math.max(Number(body.count) || 1, 1), 1000);

      const row = await env.DB.prepare(
        "SELECT food, last_regen FROM users WHERE id = ?"
      ).bind(userId).first();

      const now = Math.floor(Date.now() / 1000);
      const { food } = calcFood(row.food, row.last_regen);
      const actualCount = Math.min(count, food);

      if (actualCount <= 0) {
        return json({ error: "no food", food: 0 });
      }

      const newFood = food - actualCount;

      await env.DB.prepare(
        "UPDATE users SET score = score + ?, food = ?, last_regen = ? WHERE id = ?"
      ).bind(actualCount, newFood, now, userId).run();

      const updated = await env.DB.prepare(
        "SELECT score, food FROM users WHERE id = ?"
      ).bind(userId).first();

      return json({ id: userId, score: updated.score, food: updated.food });
    }

    return json({ error: "not found" }, 404);
  },
};