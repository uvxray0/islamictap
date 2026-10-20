const API_URL = "https://islamictap-api.xraygate.workers.dev";
const FOOD_REGEN = 2;
const FOOD_REGEN_INTERVAL = 1000;
const VILLAIN_UNLOCK_PRICE = 1000;

const VILLAINS = [
  { id: "villain_1", name: "شیطان 1", nameEn: "Devil 1", image: "assets/characters/villain_1.jpg" },
  { id: "villain_2", name: "شیطان 2", nameEn: "Devil 2", image: "assets/characters/villain_2.jpg" },
  { id: "villain_3", name: "شیطان 3", nameEn: "Devil 3", image: "assets/characters/villain_3.jpeg" },
  { id: "villain_4", name: "شیطان 4", nameEn: "Devil 4", image: "assets/characters/villain_4.jpeg" },
];

const translations = {
  fa: {
    tips_title: "توجه!", tips_text: "این پروژه موقتی است، حاوی هیچ ارز واقعی نیست، در مرحله توسعه و تست است، و پایداری لازم را ندارد. ممنون که در آزمایش آن هستید!",
    tips_ok: "باشه", score_label: "RIDAN", tab_home: "خانه", tab_shop: "فروشگاه", tab_stats: "آمار", tab_referral: "دعوت",
    leaderboard_title: "🏆 برترین‌ها", shop_title: "🛒 فروشگاه", shop_upgrades_title: "⬆️ ارتقاها", shop_heroes_title: "🦸 قهرمان‌ها", shop_chars_title: "👹 شخصیت ها",
    no_username: "بدون نام", food_storage: "انبار غذا", buy: "خرید", max_level: "حداکثر",
    toast_no_score: "موجودی کافی نیست", toast_max_level: "به حداکثر سطح رسیدی", toast_buy_success: "خرید موفق!", toast_coming_soon: "به‌زودی!",
    toast_no_gems: "جم کافی نیست", toast_donated: "اهدا شد!", toast_invalid_amount: "مقدار نامعتبر", toast_not_unlocked: "ابتدا قفل‌گشایی کنید",
    hero1: "قهرمان ۱", hero2: "قهرمان ۲", gems: "جم", referrals: "دعوت‌ها", your_link: "لینک دعوت شما", copy: "کپی", copied: "کپی شد!",
    unlock: "قفل‌گشایی", donate: "اهدا", donate_to: "اهدا به", balance: "موجودی", select: "انتخاب",
  },
  en: {
    tips_title: "Attention!", tips_text: "This project is temporary, contains no real currency, is under development and testing, and has no stability guarantee. Thanks for testing it!",
    tips_ok: "OK", score_label: "RIDAN", tab_home: "Home", tab_shop: "Shop", tab_stats: "Stats", tab_referral: "Invite",
    leaderboard_title: "🏆 Leaderboard", shop_title: "🛒 Shop", shop_upgrades_title: "⬆️ Upgrades", shop_heroes_title: "🦸 Heroes", shop_chars_title: "👹 Characters",
    no_username: "No name", food_storage: "Food Storage", buy: "Buy", max_level: "MAX",
    toast_no_score: "Not enough score", toast_max_level: "Max level reached", toast_buy_success: "Purchased!", toast_coming_soon: "Coming soon!",
    toast_no_gems: "Not enough gems", toast_donated: "Donated!", toast_invalid_amount: "Invalid amount", toast_not_unlocked: "Unlock first",
    hero1: "Hero 1", hero2: "Hero 2", gems: "Gems", referrals: "Referrals", your_link: "Your invite link", copy: "Copy", copied: "Copied!",
    unlock: "Unlock", donate: "Donate", donate_to: "Donate to", balance: "Balance", select: "Select",
  },
};

function getLang() { return localStorage.getItem("lang") || "fa"; }

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

document.getElementById("lang-switch").addEventListener("click", () => setLang(getLang() === "fa" ? "en" : "fa"));

const tipsOverlay = document.getElementById("tips-overlay");
if (!localStorage.getItem("tips_seen")) tipsOverlay.classList.add("show");
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
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2500);
}

const tg = window.Telegram?.WebApp;
const initData = tg?.initData || "";

if (!initData) {
  document.body.innerHTML = "<p style='padding:40px;text-align:center;color:#fff'>Please open this app inside Telegram.</p>";
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
  const shopHeroes = document.getElementById("shop-heroes");
  const shopGrid = document.getElementById("shop-grid");
  const referralPanel = document.getElementById("referral-panel");
  const gemsEl = document.getElementById("gems");
  const heroFlagEl = document.getElementById("hero-flag");
  const refCountEl = document.getElementById("ref-count");
  const refGemsEl = document.getElementById("ref-gems");
  const refLinkEl = document.getElementById("ref-link");
  const refCopyEl = document.getElementById("ref-copy");
  const donateOverlay = document.getElementById("donate-overlay");
  const donateTitle = document.getElementById("donate-title");
  const donateBalance = document.getElementById("donate-balance");
  const donateInput = document.getElementById("donate-input");
  const donateCancel = document.getElementById("donate-cancel");
  const donateConfirm = document.getElementById("donate-confirm");

  let token = null;
  let score = 0;
  let food = 500;
  let maxFood = 500;
  let gems = 0;
  let pendingTaps = 0;
  let sending = false;
  let debounceTimer = null;
  let throttleTimer = null;
  let leaderboardData = null;
  let currentVillain = null;

  const displayName = tg.initDataUnsafe.user.first_name || "Player";
  nameEl.textContent = displayName;
  avatarEl.textContent = displayName[0].toUpperCase();

  const userId = tg.initDataUnsafe.user.id;
  refLinkEl.value = `https://t.me/islamictapbot/app?startapp=ref_${userId}`;

  function updateFoodUI() {
    const pct = (food / maxFood) * 100;
    foodFill.style.width = `${pct}%`;
    foodText.textContent = `🍔 ${Math.floor(food)} / ${maxFood}`;
  }

  function updateGemsUI() { gemsEl.textContent = `💎 ${gems}`; }

  function regenFood() {
    if (food < maxFood) { food = Math.min(food + FOOD_REGEN, maxFood); updateFoodUI(); }
  }

  function spawnFloat(x, y) {
    const el = document.createElement("div");
    el.className = "float-text"; el.textContent = "+1";
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }

  async function auth() {
    const res = await fetch(`${API_URL}/api/auth`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData }) });
    if (!res.ok) throw new Error("auth failed");
    token = (await res.json()).token;
  }

  async function loadState() {
    const res = await fetch(`${API_URL}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    score = data.score; food = data.food; maxFood = data.max_food; gems = data.gems;
    scoreEl.textContent = score; updateFoodUI(); updateGemsUI();
    if (data.active_hero === 1) heroFlagEl.textContent = "🇮🇱";
    else if (data.active_hero === 2) heroFlagEl.textContent = "🇺🇸";
    else heroFlagEl.textContent = "";
  }

  async function processReferral() {
    const startParam = tg.initDataUnsafe.start_param;
    if (!startParam || !startParam.startsWith("ref_")) return;
    if (localStorage.getItem("referral_processed")) return;
    const referrerId = Number(startParam.replace("ref_", ""));
    if (!referrerId || referrerId === userId) return;
    try {
      const res = await fetch(`${API_URL}/api/referral`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ referrer_id: referrerId }) });
      if (res.ok) localStorage.setItem("referral_processed", "1");
    } catch (e) {}
  }

  async function loadLeaderboard() {
    const res = await fetch(`${API_URL}/api/leaderboard`);
    leaderboardData = (await res.json()).top;
    renderLeaderboard(leaderboardData);
  }

  function renderLeaderboard(top) {
    const lang = getLang();
    const medals = ["🥇", "🥈", "🥉"];
    statsList.innerHTML = "";
    top.forEach((user, i) => {
      const row = document.createElement("div"); row.className = "stats-row";
      const rank = document.createElement("div"); rank.className = "stats-rank" + (i < 3 ? " medal" : ""); rank.textContent = i < 3 ? medals[i] : i + 1;
      const name = document.createElement("div"); name.className = "stats-name"; name.textContent = user.username ? "@" + user.username : translations[lang].no_username;
      const s = document.createElement("div"); s.className = "stats-score"; s.textContent = user.score.toLocaleString();
      row.appendChild(rank); row.appendChild(name); row.appendChild(s); statsList.appendChild(row);
    });
  }

  async function loadShop() {
    const res = await fetch(`${API_URL}/api/shop`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    renderUpgrades(data.upgrades);
    renderHeroes(data.heroes);
    renderVillains(data.villains);
    gems = data.gems; updateGemsUI();
  }

  function renderUpgrades(upgrades) {
    const lang = getLang(); shopUpgrades.innerHTML = "";
    upgrades.forEach((up) => {
      const card = document.createElement("div"); card.className = "shop-card";
      const icon = document.createElement("div"); icon.className = "shop-card-icon"; icon.textContent = "🍔";
      const info = document.createElement("div"); info.className = "shop-card-info";
      const title = document.createElement("div"); title.className = "shop-card-title"; title.textContent = `${translations[lang].food_storage} (Lv ${up.level})`;
      const desc = document.createElement("div"); desc.className = "shop-card-desc"; desc.textContent = `${up.current} → ${up.next}`;
      info.appendChild(title); info.appendChild(desc);
      const btn = document.createElement("button"); btn.className = "shop-card-btn";
      if (up.level >= up.max_level) { btn.textContent = translations[lang].max_level; btn.disabled = true; }
      else { btn.textContent = `${translations[lang].buy} ${up.price}`; btn.addEventListener("click", () => buy("food", null)); }
      card.appendChild(icon); card.appendChild(info); card.appendChild(btn); shopUpgrades.appendChild(card);
    });
  }

  function renderHeroes(heroes) {
    const lang = getLang(); shopHeroes.innerHTML = "";
    heroes.forEach((h) => {
      const card = document.createElement("div"); card.className = "shop-card";
      const icon = document.createElement("div"); icon.className = "shop-card-icon"; icon.textContent = h.id === 1 ? "🇮🇱" : "🇺🇸";
      const info = document.createElement("div"); info.className = "shop-card-info";
      const title = document.createElement("div"); title.className = "shop-card-title";
      title.textContent = `${h.id === 1 ? translations[lang].hero1 : translations[lang].hero2} (Lv ${h.level})${h.active ? " ✅" : ""}`;
      const desc = document.createElement("div"); desc.className = "shop-card-desc"; desc.textContent = `${h.power}/s`;
      info.appendChild(title); info.appendChild(desc);
      const btn = document.createElement("button"); btn.className = "shop-card-btn";
      if (h.level >= h.max_level) { btn.textContent = translations[lang].max_level; btn.disabled = true; }
      else { btn.textContent = `💎 ${h.price}`; btn.addEventListener("click", () => buy("hero", h.id)); }
      card.appendChild(icon); card.appendChild(info); card.appendChild(btn);

      if (h.level > 0 && !h.active) {
        const selBtn = document.createElement("button");
        selBtn.className = "shop-card-btn";
        selBtn.style.marginRight = "6px";
        selBtn.textContent = translations[lang].select;
        selBtn.addEventListener("click", () => selectHero(h.id));
        card.appendChild(selBtn);
      }

      shopHeroes.appendChild(card);
    });
  }

  function renderVillains(villains) {
    const lang = getLang(); shopGrid.innerHTML = "";
    VILLAINS.forEach((v) => {
      const data = (villains || []).find(x => x.id === v.id) || { amount: 0, unlocked: 0 };
      const card = document.createElement("div"); card.className = "char-card";
      const img = document.createElement("img"); img.className = "char-card-img"; img.src = v.image; img.alt = lang === "fa" ? v.name : v.nameEn; img.loading = "lazy";
      const name = document.createElement("div"); name.className = "char-card-name";
      name.textContent = lang === "fa" ? v.name : v.nameEn;
      card.appendChild(img); card.appendChild(name);

      if (!data.unlocked) {
        const btn = document.createElement("button");
        btn.className = "char-card-btn";
        btn.textContent = `${translations[lang].unlock} ${VILLAIN_UNLOCK_PRICE}`;
        btn.addEventListener("click", (e) => { e.stopPropagation(); unlockVillain(v.id); });
        card.appendChild(btn);
      } else {
        const info = document.createElement("div");
        info.className = "char-card-info";
        info.textContent = `❤️ ${data.amount.toLocaleString()}`;
        card.appendChild(info);
        const btn = document.createElement("button");
        btn.className = "char-card-btn";
        btn.textContent = translations[lang].donate;
        btn.addEventListener("click", (e) => { e.stopPropagation(); openDonateModal(v); });
        card.appendChild(btn);
      }

      shopGrid.appendChild(card);
    });
  }

  async function unlockVillain(id) {
    const lang = getLang();
    const res = await fetch(`${API_URL}/api/buy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type: "villain_unlock", id }),
    });
    const data = await res.json();
    if (data.ok) {
      score = data.score; scoreEl.textContent = score;
      showToast(translations[lang].toast_buy_success, "success");
      await loadShop();
    } else {
      if (data.error === "not enough score") showToast(translations[lang].toast_no_score, "error");
      else showToast(data.error || "Error", "error");
    }
  }

  function openDonateModal(villain) {
    currentVillain = villain;
    const lang = getLang();
    donateTitle.textContent = `${translations[lang].donate_to} ${lang === "fa" ? villain.name : villain.nameEn}`;
    donateBalance.textContent = `${translations[lang].balance}: ${score.toLocaleString()}`;
    donateInput.value = "";
    donateInput.max = score;
    donateOverlay.classList.add("show");
  }

  function closeDonateModal() {
    donateOverlay.classList.remove("show");
    currentVillain = null;
  }

  donateCancel.addEventListener("click", closeDonateModal);

  donateConfirm.addEventListener("click", async () => {
    if (!currentVillain) return;
    const amount = Math.floor(Number(donateInput.value));
    const lang = getLang();

    if (!amount || amount <= 0) {
      showToast(translations[lang].toast_invalid_amount, "error");
      return;
    }
    if (amount > score) {
      showToast(translations[lang].toast_no_score, "error");
      return;
    }

    const res = await fetch(`${API_URL}/api/donate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ villain_id: currentVillain.id, amount }),
    });
    const data = await res.json();

    if (data.ok) {
      score = data.score;
      scoreEl.textContent = score;
      showToast(translations[lang].toast_donated, "success");
      closeDonateModal();
      await loadShop();
    } else {
      if (data.error === "not enough score") showToast(translations[lang].toast_no_score, "error");
      else showToast(data.error || "Error", "error");
    }
  });

  async function selectHero(id) {
    const res = await fetch(`${API_URL}/api/set-hero`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ hero: id }),
    });
    const data = await res.json();
    if (data.ok) {
      heroFlagEl.textContent = id === 1 ? "🇮🇱" : "🇺🇸";
      await loadShop();
    }
  }

  async function buy(type, id) {
    const lang = getLang();
    const res = await fetch(`${API_URL}/api/buy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type, id }),
    });
    const data = await res.json();
    if (!data.ok) {
      if (data.error === "max level") showToast(translations[lang].toast_max_level, "error");
      else if (data.error === "not enough score") showToast(translations[lang].toast_no_score, "error");
      else if (data.error === "not enough gems") showToast(translations[lang].toast_no_gems, "error");
      else showToast(data.error || "Error", "error");
      return;
    }
    if (data.score !== undefined) { score = data.score; scoreEl.textContent = score; }
    if (data.max_food !== undefined) { maxFood = data.max_food; updateFoodUI(); }
    if (data.gems !== undefined) { gems = data.gems; updateGemsUI(); }
    showToast(translations[lang].toast_buy_success, "success");
    await loadShop();
  }

  async function loadReferrals() {
    const res = await fetch(`${API_URL}/api/referrals`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    refCountEl.textContent = data.referral_count;
    refGemsEl.textContent = data.gems;
    gems = data.gems; updateGemsUI();
  }

  async function flushTaps() {
    if (sending || pendingTaps === 0 || !token) return;
    sending = true;
    const count = pendingTaps; pendingTaps = 0;
    try {
      const res = await fetch(`${API_URL}/api/tap`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ count }),
      });
      if (!res.ok) throw new Error("tap failed");
    } catch (e) {
      pendingTaps += count; score -= count; food += count;
      scoreEl.textContent = score; updateFoodUI();
    } finally { sending = false; }
  }

  function startThrottle() { if (throttleTimer) return; throttleTimer = setInterval(flushTaps, 5000); }
  function stopThrottle() { if (throttleTimer) { clearInterval(throttleTimer); throttleTimer = null; } }
  function scheduleDebounce() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { flushTaps(); stopThrottle(); }, 5000);
  }

  coinEl.addEventListener("click", (e) => {
    if (food < 1) return;
    food -= 1; score += 1;
    scoreEl.textContent = score; pendingTaps += 1;
    updateFoodUI(); spawnFloat(e.clientX, e.clientY);
    if (navigator.vibrate) navigator.vibrate(8);
    startThrottle(); scheduleDebounce();
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.getAttribute("data-tab");
      statsPanel.classList.remove("show");
      shopPanel.classList.remove("show");
      referralPanel.classList.remove("show");
      if (target === "stats") { statsPanel.classList.add("show"); renderLeaderboard(leaderboardData || []); }
      else if (target === "shop") { shopPanel.classList.add("show"); loadShop(); }
      else if (target === "referral") { referralPanel.classList.add("show"); loadReferrals(); }
    });
  });

  refCopyEl.addEventListener("click", () => {
    refLinkEl.select();
    document.execCommand("copy");
    showToast(translations[getLang()].copied, "success");
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") { flushTaps(); stopThrottle(); }
  });
  window.addEventListener("pagehide", () => { flushTaps(); stopThrottle(); });

  setInterval(regenFood, FOOD_REGEN_INTERVAL);

  (async () => {
    try {
      await auth();
      await loadState();
      await processReferral();
      await loadLeaderboard();
    } catch (e) {
      scoreEl.textContent = "?";
    }
  })();
}