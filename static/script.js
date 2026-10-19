const API_URL = "https://islamictap-api.xraygate.workers.dev";
const FOOD_REGEN = 2;
const FOOD_REGEN_INTERVAL = 1000;

const VILLAINS = [
  { id: "villain_1", name: "شیطان 1", nameEn: "Devil 1", price: 30000, image: "assets/characters/villain_1.png" },
  { id: "villain_2", name: "شیطان 2", nameEn: "Devil 2", price: 15000, image: "assets/characters/villain_2.png" },
];

const translations = {
  fa: {
    tips_title: "توجه!",
    tips_text:
      "این پروژه موقتی است، حاوی هیچ ارز واقعی نیست، در مرحله توسعه و تست است، و پایداری لازم را ندارد. ممنون که در آزمایش آن هستید!",
    tips_ok: "باشه",
    score_label: "RIDAN",
    tab_home: "خانه",
    tab_shop: "شاپ",
    tab_stats: "آمار",
    leaderboard_title: "🏆 برترین‌ها",
    shop_title: "🛒 شاپ",
    shop_upgrades_title: "⬆️ ارتقاها",
    shop_chars_title: "👹 شخصیت ها",
    no_username: "بدون نام",
    food_storage: "انبار غذا",
    buy: "خرید",
    max_level: "حداکثر",
    toast_no_score: "موجودی کافی نیست",
    toast_max_level: "به حداکثر سطح رسیدی",
    toast_buy_success: "خرید موفق!",
    toast_coming_soon: "به‌زودی!",
  },
  en: {
    tips_title: "Attention!",
    tips_text:
      "This project is temporary, contains no real currency, is under development and testing, and has no stability guarantee. Thanks for testing it!",
    tips_ok: "OK",
    score_label: "RIDAN",
    tab_home: "Home",
    tab_shop: "Shop",
    tab_stats: "Stats",
    leaderboard_title: "🏆 Leaderboard",
    shop_title: "🛒 Shop",
    shop_upgrades_title: "⬆️ Upgrades",
    shop_chars_title: "👹 Characters",
    no_username: "No name",
    food_storage: "Food Storage",
    buy: "Buy",
    max_level: "MAX",
    toast_no_score: "Not enough score",
    toast_max_level: "Max level reached",
    toast_buy_success: "Purchased!",
    toast_coming_soon: "Coming soon!",
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

const toastEl = document.getElementById("toast");
let toastTimer = null;

function showToast(message, type) {
  toastEl.textContent = "";
  const icon = document.createElement("span");
  icon.textContent = type === "success" ? "✓" : "✕";
  toastEl.appendChild(icon);
  toastEl.appendChild(document.createTextNode(" " + message));
  toastEl.className = `toast ${type} show`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2500);
}

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
  const shopPanel = document.getElementById("shop-panel");
  const shopUpgrades = document.getElementById("shop-upgrades");
  const shopGrid = document.getElementById("shop-grid");

  let token = null;
  let score = 0;
  let food = 500;
  let maxFood = 500;
  let pendingTaps = 0;
  let sending = false;
  let debounceTimer = null;
  let throttleTimer = null;
  let leaderboardData = null;

  const displayName = tg.initDataUnsafe.user.first_name || "Player";
  nameEl.textContent = displayName;
  avatarEl.textContent = displayName[0].toUpperCase();

  function updateFoodUI() {
    const pct = (food / maxFood) * 100;
    foodFill.style.width = `${pct}%`;
    foodText.textContent = `🍔 ${Math.floor(food)} / ${maxFood}`;
  }

  function regenFood() {
    if (food < maxFood) {
      food = Math.min(food + FOOD_REGEN, maxFood);
      updateFoodUI();
    }
  }

  function spawnFloat(x, y) {
    const el = document.createElement("div");
    el.className = "float-text";
    el.textContent = "+1";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
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
    maxFood = data.max_food;
    scoreEl.textContent = score;
    updateFoodUI();
  }

  async function loadLeaderboard() {
    const res = await fetch(`${API_URL}/api/leaderboard`);
    const data = await res.json();
    leaderboardData = data.top;
    renderLeaderboard(leaderboardData);
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

  async function loadShop() {
    const res = await fetch(`${API_URL}/api/shop`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    renderUpgrades(data.upgrades);
    renderVillains();
  }

  function renderUpgrades(upgrades) {
    const lang = getLang();
    shopUpgrades.innerHTML = "";

    upgrades.forEach((up) => {
      const card = document.createElement("div");
      card.className = "shop-card";

      const icon = document.createElement("div");
      icon.className = "shop-card-icon";
      icon.textContent = "🍔";

      const info = document.createElement("div");
      info.className = "shop-card-info";

      const title = document.createElement("div");
      title.className = "shop-card-title";
      title.textContent = `${translations[lang].food_storage} (Lv ${up.level})`;

      const desc = document.createElement("div");
      desc.className = "shop-card-desc";
      desc.textContent = `${up.current} → ${up.next}`;

      info.appendChild(title);
      info.appendChild(desc);

      const btn = document.createElement("button");
      btn.className = "shop-card-btn";
      if (up.level >= up.max_level) {
        btn.textContent = translations[lang].max_level;
        btn.disabled = true;
      } else {
        btn.textContent = `${translations[lang].buy} ${up.price}`;
        btn.addEventListener("click", () => buyUpgrade(up.id));
      }

      card.appendChild(icon);
      card.appendChild(info);
      card.appendChild(btn);
      shopUpgrades.appendChild(card);
    });
  }

  function renderVillains() {
    const lang = getLang();
    shopGrid.innerHTML = "";

    VILLAINS.forEach((v) => {
      const card = document.createElement("div");
      card.className = "char-card";

      const img = document.createElement("img");
      img.className = "char-card-img";
      img.src = v.image;
      img.alt = lang === "fa" ? v.name : v.nameEn;
      img.loading = "lazy";

      const name = document.createElement("div");
      name.className = "char-card-name";
      name.textContent = `${lang === "fa" ? v.name : v.nameEn} · ${v.price.toLocaleString()}`;

      card.appendChild(img);
      card.appendChild(name);
      card.addEventListener("click", () => {
        showToast(translations[lang].toast_coming_soon, "error");
      });
      shopGrid.appendChild(card);
    });
  }

  async function buyUpgrade(upgradeId) {
    const lang = getLang();
    const res = await fetch(`${API_URL}/api/buy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ upgrade_id: upgradeId }),
    });
    const data = await res.json();

    if (!data.ok) {
      if (data.error === "max level") {
        showToast(translations[lang].toast_max_level, "error");
      } else if (data.error === "not enough score") {
        showToast(translations[lang].toast_no_score, "error");
      } else {
        showToast(data.error || "Error", "error");
      }
      return;
    }

    score = data.score;
    maxFood = data.max_food;
    scoreEl.textContent = score;
    updateFoodUI();
    showToast(translations[lang].toast_buy_success, "success");
    await loadShop();
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

  coinEl.addEventListener("click", (e) => {
    if (food < 1) return;
    food -= 1;
    score += 1;
    scoreEl.textContent = score;
    pendingTaps += 1;
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
      statsPanel.classList.remove("show");
      shopPanel.classList.remove("show");
      if (target === "stats") {
        statsPanel.classList.add("show");
        renderLeaderboard(leaderboardData || []);
      } else if (target === "shop") {
        shopPanel.classList.add("show");
        loadShop();
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
      await loadLeaderboard();
    } catch (e) {
      scoreEl.textContent = "?";
    }
  })();
}