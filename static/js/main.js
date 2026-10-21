const FOOD_REGEN = 2;
const FOOD_REGEN_INTERVAL = 1000;

let tg = null;
let initData = "";

function startThrottle() {
  if (window.state.throttleTimer) return;
  window.state.throttleTimer = setInterval(flushTaps, 5000);
}

function stopThrottle() {
  if (window.state.throttleTimer) {
    clearInterval(window.state.throttleTimer);
    window.state.throttleTimer = null;
  }
}

function scheduleDebounce() {
  if (window.state.debounceTimer) clearTimeout(window.state.debounceTimer);
  window.state.debounceTimer = setTimeout(() => {
    flushTaps();
    stopThrottle();
  }, 5000);
}

async function flushTaps() {
  if (window.state.sending || window.state.pendingTaps === 0 || !window.state.token) return;
  window.state.sending = true;
  const count = window.state.pendingTaps;
  window.state.pendingTaps = 0;

  try {
    const res = await fetch(`${API_URL}/api/tap`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${window.state.token}` },
      body: JSON.stringify({ count }),
    });
    if (!res.ok) throw new Error("tap failed");
  } catch (e) {
    window.state.pendingTaps += count;
    window.state.score -= count;
    window.state.food += count;
    document.getElementById("score").textContent = window.state.score;
    updateFoodUI();
  } finally {
    window.state.sending = false;
  }
}

function startHeroTick() {
  if (window.state.heroTickTimer) return;
  window.state.heroTickTimer = setInterval(async () => {
    if (window.state.heroPower <= 0) return;
    window.state.score += window.state.heroPower;
    document.getElementById("score").textContent = window.state.score;
    try {
      await apiHeroTick();
    } catch (e) {}
  }, 1000);
}

function regenFood() {
  if (window.state.food < window.state.maxFood) {
    window.state.food = Math.min(window.state.food + FOOD_REGEN, window.state.maxFood);
    updateFoodUI();
  }
}

async function loadState() {
  const data = await apiMe();
  window.state.score = data.score;
  window.state.food = data.food;
  window.state.maxFood = data.max_food;
  window.state.gems = data.gems;
  window.state.heroPower = data.hero_power || 0;

  document.getElementById("score").textContent = window.state.score;
  updateFoodUI();
  updateGemsUI();
  updateSpeedUI();

  if (window.state.heroPower > 0) startHeroTick();
}

async function loadLeaderboard() {
  const data = await apiLeaderboard();
  window.state.leaderboardData = data;
  renderLeaderboard(window.state.leaderboardData);
}

async function init() {
  tg = window.Telegram?.WebApp;
  initData = tg?.initData || "";

  if (!initData) {
    document.body.innerHTML = "<p style='padding:40px;text-align:center;color:#fff'>Please open this app inside Telegram.</p>";
    return;
  }

  tg.ready();
  tg.expand();

  const tipsOverlay = document.getElementById("tips-overlay");
  if (!localStorage.getItem("tips_seen")) tipsOverlay.classList.add("show");
  document.getElementById("tips-ok").addEventListener("click", () => {
    localStorage.setItem("tips_seen", "1");
    tipsOverlay.classList.remove("show");
  });

  document.getElementById("lang-switch").addEventListener("click", () => {
    setLang(getLang() === "fa" ? "en" : "fa");
  });

  setLang(getLang());

  const userId = tg.initDataUnsafe.user.id;
  const refLinkEl = document.getElementById("ref-link");
  refLinkEl.value = `https://t.me/islamictapbot/app?startapp=ref_${userId}`;

  document.getElementById("ref-copy").addEventListener("click", () => {
    refLinkEl.select();
    document.execCommand("copy");
    showToast(translations[getLang()].copied, "success");
  });

  document.getElementById("donate-cancel").addEventListener("click", closeDonateModal);
  document.getElementById("donate-confirm").addEventListener("click", confirmDonate);

  const displayName = tg.initDataUnsafe.user.first_name || "Player";
  document.getElementById("user-name").textContent = displayName;
  document.getElementById("user-avatar").textContent = displayName[0].toUpperCase();

  const coinEl = document.getElementById("coin");
  coinEl.addEventListener("click", (e) => {
    if (window.state.food < 1) return;
    window.state.food -= 1;
    window.state.score += 1;
    document.getElementById("score").textContent = window.state.score;
    window.state.pendingTaps += 1;
    updateFoodUI();
    spawnFloat(e.clientX, e.clientY);
    if (navigator.vibrate) navigator.vibrate(8);
    startThrottle();
    scheduleDebounce();
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const target = tab.getAttribute("data-tab");
      document.getElementById("stats-panel").classList.remove("show");
      document.getElementById("shop-panel").classList.remove("show");
      document.getElementById("referral-panel").classList.remove("show");

      if (target === "stats") {
        document.getElementById("stats-panel").classList.add("show");
        renderLeaderboard(window.state.leaderboardData || { total_users: 0, top: [] });
      } else if (target === "shop") {
        document.getElementById("shop-panel").classList.add("show");
        loadShop();
      } else if (target === "referral") {
        document.getElementById("referral-panel").classList.add("show");
        loadReferrals();
      }
    });
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

  try {
    const data = await apiAuth(initData);
    window.state.token = data.token;
    await loadState();
    await processReferral();
    await loadLeaderboard();
  } catch (e) {
    document.getElementById("score").textContent = "?";
  }
}

document.addEventListener("DOMContentLoaded", init);