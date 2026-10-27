const REFERRAL_GEMS = 15;

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

async function loadReferrals() {
  const data = await apiReferrals();
  document.getElementById("ref-count").textContent = data.referral_count;
  document.getElementById("ref-gems").textContent = data.gems;
  window.state.gems = data.gems;
  updateGemsUI();

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