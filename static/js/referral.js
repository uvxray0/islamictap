async function processReferral() {
  const tg = window.Telegram?.WebApp;
  const startParam = tg?.initDataUnsafe?.start_param;
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
}