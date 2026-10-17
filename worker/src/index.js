const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return Response.json(data, { status, headers: cors });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (url.pathname === "/api/me") {
      const id = Number(url.searchParams.get("id")) || 0;
      if (!id) return json({ error: "missing id" }, 400);

      const row = await env.DB.prepare(
        "SELECT id, score, created_at FROM users WHERE id = ?"
      ).bind(id).first();

      if (!row) return json({ id, score: 0, exists: false });

      return json({ ...row, exists: true });
    }

    if (url.pathname === "/api/tap" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const id = Number(body.id) || 0;

      if (!id) return json({ error: "missing id" }, 400);

      await env.DB.prepare(
        `INSERT INTO users (id, score) VALUES (?, 1)
         ON CONFLICT(id) DO UPDATE SET score = score + 1`
      ).bind(id).run();

      const row = await env.DB.prepare(
        "SELECT score FROM users WHERE id = ?"
      ).bind(id).first();

      return json({ id, score: row.score });
    }

    return json({ error: "not found" }, 404);
  },
};