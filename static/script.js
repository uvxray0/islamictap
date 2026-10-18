const API_URL = "https://islamictap-api.xraygate.workers.dev";
const MAX_FOOD = 500;
const FOOD_REGEN = 2;
const FOOD_REGEN_INTERVAL = 1000;

const translations = {
  fa: {
    tips_title: "توجه!",
    tips_text:
      "این پروژه موقتی است، حاوی هیچ ارز واقعی نیست، در مرحله توسعه و تست است، و پایداری لازم را ندارد. ممنون که در آزمایش آن هستید!",
    tips_ok: "باشه",
    score_label: "RIDAN",
    tab_home: "خانه",
    tab_stats: "آمار",
    leaderboard_title: "🏆 برترین‌ها",
    no_username: "بدون نام",
  },
  en: {
    tips_title: "Attention!",
    tips_text:
      "This project is temporary, contains no real currency, is under development and testing, and has no stability guarantee. Thanks for testing it!",
    tips_ok: "OK",
    score_label: "RIDAN",
    tab_home: "Home",
    tab_stats: "Stats",
    leaderboard_title: "🏆 Leaderboard",
    no_username: "No name",
  },
};

function getLang() {
  return localStorage.getItem("lang") || "fa";
}

function setLang(lang) {
  localStorage.setItem("lang", lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (translations[lang][key]) el.textContent = translations[lang][key];
  });
  document.getElementById("lang-switch").textContent = lang === "fa" ? "EN" : "فا";
}

document.getElementById("lang-switch").addEventListener("click", () => {
  setLang(getLang() === "fa" ? "en" : "fa");
});

const tipsOverlay = document.getElementById("tips-overlay");
if (!localStorage.getItem("tips_seen")) {
  tipsOverlay.classList.add("show");
}
document.getElementById("tips-ok").addEventListener("click", () => {
  localStorage.setItem("tips_seen", "1");
  tipsOverlay.classList.remove("show");
});

setLang(getLang());

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
  const statsPanel = document.getElementById("stats-panel");
  const statsList = document.getElementById("stats-list");

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

  async function loadLeaderboard() {
    const res = await fetch(`${API_URL}/api/leaderboard`);
    const data = await res.json();
    renderLeaderboard(data.top);
  }

  function renderLeaderboard(top) {
    const lang = getLang();
    const medals = ["🥇", "🥈", "🥉"];
    statsList.innerHTML = "";

    top.forEach((user, i) => {
      const row = document.createElement("div");
      row.className = "stats-row";

      const rank = document.createElement("div");
      rank.className = "stats-rank" + (i < 3 ? " medal" : "");
      rank.textContent = i < 3 ? medals[i] : i + 1;

      const name = document.createElement("div");
      name.className = "stats-name";
      name.textContent = user.username
        ? "@" + user.username
        : translations[lang].no_username;

      const scoreEl2 = document.createElement("div");
      scoreEl2.className = "stats-score";
      scoreEl2.textContent = user.score.toLocaleString();

      row.appendChild(rank);
      row.appendChild(name);
      row.appendChild(scoreEl2);
      statsList.appendChild(row);
    });
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

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.getAttribute("data-tab");
      if (target === "stats") {
        statsPanel.classList.add("show");
        loadLeaderboard();
      } else {
        statsPanel.classList.remove("show");
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

  (async () => {
    try {
      await auth();
      await loadState();
    } catch (e) {
      scoreEl.textContent = "?";
    }
  })();
}