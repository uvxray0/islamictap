const API_URL = "https://islamictap-api.xraygate.workers.dev";

const tg = window.Telegram?.WebApp;
const user = tg?.initData ? tg.initDataUnsafe.user : null;

if (!user) {
  document.body.innerHTML =
    "<p style='padding:40px;text-align:center;color:#fff'>Please open this app inside Telegram.</p>";
} else {
  tg.ready();
  tg.expand();

  const coinEl = document.getElementById("coin");
  const scoreEl = document.getElementById("score");
  const nameEl = document.getElementById("user-name");
  const avatarEl = document.getElementById("user-avatar");

  const displayName = user.first_name || user.username || "Player";
  nameEl.textContent = displayName;
  avatarEl.textContent = displayName[0].toUpperCase();

  async function loadScore() {
    try {
      const res = await fetch(`${API_URL}/api/me?id=${user.id}`);
      const data = await res.json();
      scoreEl.textContent = data.score;
    } catch (e) {
      scoreEl.textContent = "?";
    }
  }

  async function sendTap() {
    try {
      const res = await fetch(`${API_URL}/api/tap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id }),
      });
      const data = await res.json();
      scoreEl.textContent = data.score;
    } catch (e) {}
  }

  coinEl.addEventListener("click", () => {
    scoreEl.textContent = Number(scoreEl.textContent) + 1;
    if (navigator.vibrate) navigator.vibrate(8);
    sendTap();
  });

  loadScore();
}