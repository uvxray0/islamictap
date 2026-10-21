const API_URL = "https://islamictap-api.xraygate.workers.dev";

async function apiAuth(initData) {
  const res = await fetch(`${API_URL}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData }),
  });
  if (!res.ok) throw new Error("auth failed");
  return res.json();
}

async function apiMe() {
  const res = await fetch(`${API_URL}/api/me`, {
    headers: { Authorization: `Bearer ${window.state.token}` },
  });
  return res.json();
}

async function apiTap(count) {
  const res = await fetch(`${API_URL}/api/tap`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${window.state.token}` },
    body: JSON.stringify({ count }),
  });
  return res.json();
}

async function apiHeroTick() {
  const res = await fetch(`${API_URL}/api/hero-tick`, {
    method: "POST",
    headers: { Authorization: `Bearer ${window.state.token}` },
  });
  return res.json();
}

async function apiShop() {
  const res = await fetch(`${API_URL}/api/shop`, {
    headers: { Authorization: `Bearer ${window.state.token}` },
  });
  return res.json();
}

async function apiBuy(type, id) {
  const res = await fetch(`${API_URL}/api/buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${window.state.token}` },
    body: JSON.stringify({ type, id }),
  });
  return res.json();
}

async function apiDonate(villainId, amount) {
  const res = await fetch(`${API_URL}/api/donate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${window.state.token}` },
    body: JSON.stringify({ villain_id: villainId, amount }),
  });
  return res.json();
}

async function apiReferral(referrerId) {
  const res = await fetch(`${API_URL}/api/referral`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${window.state.token}` },
    body: JSON.stringify({ referrer_id: referrerId }),
  });
  return res.json();
}

async function apiReferrals() {
  const res = await fetch(`${API_URL}/api/referrals`, {
    headers: { Authorization: `Bearer ${window.state.token}` },
  });
  return res.json();
}

async function apiLeaderboard() {
  const res = await fetch(`${API_URL}/api/leaderboard`);
  return res.json();
}