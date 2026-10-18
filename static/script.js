const API_URL = "https://islamictap-api.xraygate.workers.dev";
const MAX_FOOD = 500;
const FOOD_REGEN = 2;
const FOOD_REGEN_INTERVAL = 1000;

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
  const foodFill = document.getElementById("food-fill");
  const foodText = document.getElementById("food-text");

  let token = null;
  let score = 0;
  let food = MAX_FOOD;
  let pendingTaps = 0;
  let sending = false;
  let debounceTimer = null;
  let throttleTimer = null;

  const displayName = tg.initDataUnsafe.user.first_name || "Player";
  nameEl.textContent = displayName;
  avatarEl.textContent = displayName[0].toUpperCase();

  function updateFoodUI() {
    const pct = (food / MAX_FOOD) * 100;
    foodFill.style.width = `${pct}%`;
    foodText.textContent = `🍔 ${Math.floor(food)} / ${MAX_FOOD}`;
  }

  function regenFood() {
    if (food < MAX_FOOD) {
      food = Math.min(food + FOOD_REGEN, MAX_FOOD);
      updateFoodUI();
    }
  }

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

  async function loadState() {
    const res = await fetch(`${API_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    score = data.score;
    food = data.food;
    scoreEl.textContent = score;
    updateFoodUI();
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
      if (!res.ok) throw new Error("tap failed");
    } catch (e) {
      pendingTaps += count;
      score -= count;
      food += count;
      scoreEl.textContent = score;
      updateFoodUI();
    } finally {
      sending = false;
    }
  }

  function startThrottle() {
    if (throttleTimer) return;
    throttleTimer = setInterval(flushTaps, 5000);
  }

  function stopThrottle() {
    if (throttleTimer) {
      clearInterval(throttleTimer);
      throttleTimer = null;
    }
  }

  function scheduleDebounce() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      flushTaps();
      stopThrottle();
    }, 5000);
  }

  coinEl.addEventListener("click", () => {
    if (food < 1) return;
    food -= 1;
    score += 1;
    scoreEl.textContent = score;
    pendingTaps += 1;
    updateFoodUI();
    if (navigator.vibrate) navigator.vibrate(8);
    startThrottle();
    scheduleDebounce();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushTaps();
      stopThrottle();
    }
  });
  window.addEventListener("pagehide", () => {
    flushTaps();
    stopThrottle();
  });

  setInterval(regenFood, FOOD_REGEN_INTERVAL);

  (async () => {
    try {
      await auth();
      await loadState();
    } catch (e) {
      scoreEl.textContent = "?";
    }
  })();
}