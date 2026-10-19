const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const FOOD_SPACES = [500, 1000, 2000, 4000, 6000, 8000];
const FOOD_PRICES = [2000, 4000, 6000, 8000, 10000];
const FOOD_MAX_LEVEL = 5;
const FOOD_REGEN = 2;
const FOOD_REGEN_INTERVAL = 1000;

const HERO1_PRICES = [15, 40, 80];
const HERO1_POWER = [10, 30, 80];
const HERO2_PRICES = [5, 15, 35];
const HERO2_POWER = [3, 10, 30];
const REFERRAL_GEMS = 15;

function json(data, status = 200) {
  return Response.json(data, { status, headers: cors });
}

function getMaxFood(level) {
  return FOOD_SPACES[Math.min(level, FOOD_MAX_LEVEL)];
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
  const secretKey = await crypto.subtle.importKey("raw", encoder.encode("WebAppData"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const secret = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(botToken));
  const hmacKey = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", hmacKey, encoder.encode(dataCheckString));
  const computed = [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (computed !== hash) return null;
  const userJson = params.get("user");
  return userJson ? JSON.parse(userJson) : null;
}

async function getUserFromToken(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "");
  if (!token) return null;
  const row = await env.DB.prepare("SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?").bind(token, Date.now()).first();
  return row ? row.user_id : null;
}

function calcFood(currentFood, lastRegen, maxFood) {
  const now = Math.floor(Date.now() / 1000);
  const elapsed = now - lastRegen;
  const regen = Math.floor((elapsed * FOOD_REGEN) / (FOOD_REGEN_INTERVAL / 1000));
  const newFood = Math.min(currentFood + regen, maxFood);
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

      await env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(Date.now()).run();
      const existing = await env.DB.prepare("SELECT token FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY expires_at DESC LIMIT 1").bind(user.id, Date.now()).first();

      if (existing) {
        await env.DB.prepare("UPDATE users SET username = ? WHERE id = ?").bind(user.username || "", user.id).run();
        return json({ token: existing.token, user: { id: user.id, first_name: user.first_name } });
      }

      const token = crypto.randomUUID();
      const expiresAt = Date.now() + 1000 * 60 * 60 * 72;

      await env.DB.batch([
        env.DB.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").bind(token, user.id, expiresAt),
        env.DB.prepare("INSERT INTO users (id, username) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET username = ?").bind(user.id, user.username || "", user.username || ""),
      ]);

      return json({ token, user: { id: user.id, first_name: user.first_name } });
    }

    if (url.pathname === "/api/leaderboard") {
      const rows = await env.DB.prepare("SELECT id, username, score FROM users ORDER BY score DESC LIMIT 10").all();
      return json({ top: rows.results });
    }

    const userId = await getUserFromToken(request, env);
    if (!userId) return json({ error: "unauthorized" }, 401);

    if (url.pathname === "/api/me") {
      const row = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
      if (!row) return json({ id: userId, score: 0, food: 500, max_food: 500, gems: 0 });
      const maxFood = getMaxFood(row.food_capacity_level);
      const { food } = calcFood(row.food, row.last_regen, maxFood);
      return json({ ...row, food, max_food: maxFood });
    }

    if (url.pathname === "/api/tap" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const count = Math.min(Math.max(Number(body.count) || 1, 1), 1000);
      const row = await env.DB.prepare("SELECT food, last_regen, food_capacity_level FROM users WHERE id = ?").bind(userId).first();
      const maxFood = getMaxFood(row.food_capacity_level);
      const now = Math.floor(Date.now() / 1000);
      const { food } = calcFood(row.food, row.last_regen, maxFood);
      const actualCount = Math.min(count, food);
      if (actualCount <= 0) return json({ error: "no food", food: 0, max_food: maxFood });

      await env.DB.prepare("UPDATE users SET score = score + ?, food = ?, last_regen = ? WHERE id = ?").bind(actualCount, food - actualCount, now, userId).run();
      const updated = await env.DB.prepare("SELECT score, food FROM users WHERE id = ?").bind(userId).first();
      return json({ id: userId, score: updated.score, food: updated.food, max_food: maxFood });
    }

    if (url.pathname === "/api/shop") {
      const row = await env.DB.prepare("SELECT food_capacity_level, hero1_level, hero2_level, gems, active_hero FROM users WHERE id = ?").bind(userId).first();
      const level = row.food_capacity_level;
      const isMax = level >= FOOD_MAX_LEVEL;
      return json({
        upgrades: [{
          id: "food_capacity", level,
          price: isMax ? 0 : FOOD_PRICES[level],
          current: getMaxFood(level),
          next: isMax ? getMaxFood(level) : getMaxFood(level + 1),
          max_level: FOOD_MAX_LEVEL,
        }],
        heroes: [
          { id: 1, level: row.hero1_level, price: row.hero1_level >= 3 ? 0 : HERO1_PRICES[row.hero1_level], power: HERO1_POWER[row.hero1_level], max_level: 3, active: row.active_hero === 1 },
          { id: 2, level: row.hero2_level, price: row.hero2_level >= 3 ? 0 : HERO2_PRICES[row.hero2_level], power: HERO2_POWER[row.hero2_level], max_level: 3, active: row.active_hero === 2 },
        ],
        gems: row.gems,
      });
    }

    if (url.pathname === "/api/buy" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const type = body.type;
      const id = body.id;

      if (type === "food") {
        const row = await env.DB.prepare("SELECT score, food_capacity_level FROM users WHERE id = ?").bind(userId).first();
        if (row.food_capacity_level >= FOOD_MAX_LEVEL) return json({ error: "max level" }, 400);
        const price = FOOD_PRICES[row.food_capacity_level];
        if (row.score < price) return json({ error: "not enough score" }, 400);
        await env.DB.prepare("UPDATE users SET score = score - ?, food_capacity_level = food_capacity_level + 1 WHERE id = ?").bind(price, userId).run();
        const updated = await env.DB.prepare("SELECT score, food_capacity_level FROM users WHERE id = ?").bind(userId).first();
        return json({ ok: true, score: updated.score, max_food: getMaxFood(updated.food_capacity_level) });
      }

      if (type === "hero") {
        const row = await env.DB.prepare("SELECT gems, hero1_level, hero2_level FROM users WHERE id = ?").bind(userId).first();
        const level = id === 1 ? row.hero1_level : row.hero2_level;
        if (level >= 3) return json({ error: "max level" }, 400);
        const price = id === 1 ? HERO1_PRICES[level] : HERO2_PRICES[level];
        if (row.gems < price) return json({ error: "not enough gems" }, 400);
        const col = id === 1 ? "hero1_level" : "hero2_level";
        await env.DB.prepare(`UPDATE users SET gems = gems - ?, ${col} = ${col} + 1 WHERE id = ?`).bind(price, userId).run();
        const updated = await env.DB.prepare("SELECT gems, hero1_level, hero2_level FROM users WHERE id = ?").bind(userId).first();
        return json({ ok: true, gems: updated.gems, hero1_level: updated.hero1_level, hero2_level: updated.hero2_level });
      }

      return json({ error: "invalid buy" }, 400);
    }

    if (url.pathname === "/api/referral" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const referrerId = Number(body.referrer_id);
      if (!referrerId || referrerId === userId) return json({ error: "invalid referrer" }, 400);

      const existing = await env.DB.prepare("SELECT referred_by FROM users WHERE id = ?").bind(userId).first();
      if (existing.referred_by) return json({ error: "already referred" }, 400);

      const referrer = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(referrerId).first();
      if (!referrer) return json({ error: "referrer not found" }, 404);

      await env.DB.batch([
        env.DB.prepare("INSERT INTO referrals (referrer_id, referred_id, gems_awarded) VALUES (?, ?, ?)").bind(referrerId, userId, REFERRAL_GEMS),
        env.DB.prepare("UPDATE users SET gems = gems + ?, referral_count = referral_count + 1 WHERE id = ?").bind(REFERRAL_GEMS, referrerId),
        env.DB.prepare("UPDATE users SET referred_by = ? WHERE id = ?").bind(referrerId, userId),
      ]);

      return json({ ok: true, gems_awarded: REFERRAL_GEMS });
    }

    if (url.pathname === "/api/referrals") {
      const row = await env.DB.prepare("SELECT gems, referral_count, referred_by FROM users WHERE id = ?").bind(userId).first();
      return json({ gems: row.gems, referral_count: row.referral_count, referred_by: row.referred_by });
    }

    if (url.pathname === "/api/set-hero" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const hero = body.hero;
      if (hero !== 1 && hero !== 2 && hero !== null) return json({ error: "invalid hero" }, 400);
      const row = await env.DB.prepare("SELECT hero1_level, hero2_level FROM users WHERE id = ?").bind(userId).first();
      if (hero === 1 && row.hero1_level < 1) return json({ error: "not owned" }, 400);
      if (hero === 2 && row.hero2_level < 1) return json({ error: "not owned" }, 400);
      await env.DB.prepare("UPDATE users SET active_hero = ? WHERE id = ?").bind(hero, userId).run();
      return json({ ok: true, active_hero: hero });
    }

    return json({ error: "not found" }, 404);
  },
};