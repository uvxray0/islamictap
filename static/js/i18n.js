const translations = {
  fa: {
    tips_title: "توجه!", tips_text: "این پروژه موقتی است، حاوی هیچ ارز واقعی نیست، در مرحله توسعه و تست است، و پایداری لازم را ندارد. ممنون که در آزمایش آن هستید!",
    tips_ok: "باشه", score_label: "RIDAN", tab_home: "خانه", tab_shop: "فروشگاه", tab_stats: "آمار", tab_referral: "دعوت",
    leaderboard_title: "🏆 برترین‌ها", members: "عضو", shop_title: "🛒 فروشگاه", shop_upgrades_title: "⬆️ ارتقاها", shop_heroes_title: "🦸 قهرمان‌ها", shop_chars_title: "👹 شخصیت ها",
    no_username: "بدون نام", food_storage: "انبار غذا", buy: "خرید", max_level: "حداکثر",
    toast_no_score: "موجودی کافی نیست", toast_max_level: "به حداکثر سطح رسیدی", toast_buy_success: "خرید موفق!", toast_coming_soon: "به‌زودی!",
    toast_no_gems: "جم کافی نیست", toast_donated: "اهدا شد!", toast_invalid_amount: "مقدار نامعتبر", toast_not_unlocked: "ابتدا قفل‌گشایی کنید",
    hero1: "قهرمان ۱", hero2: "قهرمان ۲", gems: "جم", referrals: "دعوت‌ها", your_link: "لینک دعوت شما", copy: "کپی", copied: "کپی شد!",
    unlock: "قفل‌گشایی", donate: "اهدا", donate_to: "اهدا به", balance: "موجودی", cancel: "لغو", confirm: "تأیید", donate_amount: "مقدار اهدا",
  },
  en: {
    tips_title: "Attention!", tips_text: "This project is temporary, contains no real currency, is under development and testing, and has no stability guarantee. Thanks for testing it!",
    tips_ok: "OK", score_label: "RIDAN", tab_home: "Home", tab_shop: "Shop", tab_stats: "Stats", tab_referral: "Invite",
    leaderboard_title: "🏆 Leaderboard", members: "members", shop_title: "🛒 Shop", shop_upgrades_title: "⬆️ Upgrades", shop_heroes_title: "🦸 Heroes", shop_chars_title: "👹 Characters",
    no_username: "No name", food_storage: "Food Storage", buy: "Buy", max_level: "MAX",
    toast_no_score: "Not enough score", toast_max_level: "Max level reached", toast_buy_success: "Purchased!", toast_coming_soon: "Coming soon!",
    toast_no_gems: "Not enough gems", toast_donated: "Donated!", toast_invalid_amount: "Invalid amount", toast_not_unlocked: "Unlock first",
    hero1: "Hero 1", hero2: "Hero 2", gems: "Gems", referrals: "Referrals", your_link: "Your invite link", copy: "Copy", copied: "Copied!",
    unlock: "Unlock", donate: "Donate", donate_to: "Donate to", balance: "Balance", cancel: "Cancel", confirm: "Confirm", donate_amount: "Donation amount",
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

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (translations[lang][key]) el.placeholder = translations[lang][key];
  });

  document.getElementById("lang-switch").textContent = lang === "fa" ? "EN" : "فا";

  if (window.state.currentVillain) {
    const v = window.state.currentVillain;
    const titleEl = document.getElementById("donate-title");
    const balanceEl = document.getElementById("donate-balance");
    titleEl.textContent = `${translations[lang].donate_to} ${lang === "fa" ? v.name : v.nameEn}`;
    balanceEl.textContent = `${translations[lang].balance}: ${window.state.score.toLocaleString()}`;
  }
}