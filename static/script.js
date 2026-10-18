const API_URL = "https://islamictap-api.xraygate.workers.dev";

const tg = window.Telegram?.WebApp;
const initData = tg?.initData || "";

if (!initData) {
  document.body.innerHTML =
    "<p style='padding:40px;text-align:center;color:#fff'>Please open this app inside Telegram.</p>";
} else {
  tg.ready();
  tg.expand();

  const coinEl = document.getElementById("coin");
  const scoreEl = document.getElementById("score");
  const nameEl = document.getElementById("user-name");
  const avatarEl = document.getElementById("user-avatar");

  let token = null;
  let pendingTaps = 0;
  let sending = false;

  const displayName = tg.initDataUnsafe.user.first_name || "Player";
  nameEl.textContent = displayName;
  avatarEl.textContent = displayName[0].toUpperCase();

  async function auth() {
    const res = await fetch(`${API_URL}/api/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    });
    if (!res.ok) throw new Error("auth failed");
    const data = await res.json();
    token = data.token;
  }

  async function loadScore() {
    const res = await fetch(`${API_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    scoreEl.textContent = data.score;
  }

  async function flushTaps() {
    if (sending || pendingTaps === 0 || !token) return;
    sending = true;
    const count = pendingTaps;
    pendingTaps = 0;
    try {
      const res = await fetch(`${API_URL}/api/tap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ count }),
      });
      const data = await res.json();
      scoreEl.textContent = data.score;
    } catch (e) {
      pendingTaps += count;
    } finally {
      sending = false;
    }
  }

  coinEl.addEventListener("click", () => {
    scoreEl.textContent = Number(scoreEl.textContent) + 1;
    pendingTaps += 1;
    if (navigator.vibrate) navigator.vibrate(8);
  });

  setInterval(flushTaps, 5000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushTaps();
  });
  window.addEventListener("pagehide", flushTaps);

  (async () => {
    try {
      await auth();
      await loadScore();
    } catch (e) {
      scoreEl.textContent = "?";
    }
  })();
}