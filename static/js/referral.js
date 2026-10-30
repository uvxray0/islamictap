const REFERRAL_GEMS = 15;
const REFERRAL_TIERS = [
  { count: 1, total: 15 },
  { count: 3, total: 65 },
  { count: 5, total: 120 },
  { count: 10, total: 220 },
  { count: 25, total: 495 },
];

async function processReferral() {
  let startParam = tg?.initDataUnsafe?.start_param;

  if (!startParam) {
    const urlParams = new URLSearchParams(window.location.search);
    startParam = urlParams.get("tgWebAppStartParam");
  }

  if (!startParam || !startParam.startsWith("ref_")) return;
  if (localStorage.getItem("referral_processed")) return;

  const referrerId = Number(startParam.replace("ref_", ""));
  const userId = tg.initDataUnsafe.user.id;
  if (!referrerId || referrerId === userId) return;

  try {
    const data = await apiReferral(referrerId);
    if (data.ok) localStorage.setItem("referral_processed", "1");
  } catch (e) {}
}

function renderTiers(currentCount) {
  const lang = getLang();
  const membersText = translations[lang].members;
  const container = document.getElementById("referral-tiers-list");
  if (!container) return;

  container.innerHTML = "";

  REFERRAL_TIERS.forEach((tier) => {
    const el = document.createElement("div");
    el.className = "referral-tier";
    if (currentCount >= tier.count) el.classList.add("active");

    const countEl = document.createElement("span");
    countEl.className = "referral-tier-count";
    countEl.textContent = `${tier.count} ${membersText}`;

    const rewardEl = document.createElement("span");
    rewardEl.className = "referral-tier-reward";
    rewardEl.textContent = `💎 ${tier.total}`;

    el.appendChild(countEl);
    el.appendChild(rewardEl);
    container.appendChild(el);
  });
}

async function loadReferrals() {
  const data = await apiReferrals();
  document.getElementById("ref-count").textContent = data.referral_count;
  document.getElementById("ref-gems").textContent = data.gems;
  window.state.gems = data.gems;
  window.state.referralCount = data.referral_count;
  updateGemsUI();

  renderTiers(data.referral_count);

  const listEl = document.getElementById("referral-list");
  const lang = getLang();
  listEl.innerHTML = "";

  if (!data.list || data.list.length === 0) {
    const empty = document.createElement("div");
    empty.className = "referral-empty";
    empty.textContent = translations[lang].no_referrals;
    listEl.appendChild(empty);
    return;
  }

  data.list.forEach((ref) => {
    const item = document.createElement("div");
    item.className = "referral-item";

    const name = document.createElement("div");
    name.className = "referral-item-name";
    name.textContent = ref.username ? "@" + ref.username : translations[lang].no_username;

    const gems = document.createElement("div");
    gems.className = "referral-item-gems";
    gems.textContent = `💎 ${REFERRAL_GEMS}`;

    item.appendChild(name);
    item.appendChild(gems);
    listEl.appendChild(item);
  });
}