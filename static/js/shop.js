const VILLAINS = [
  { id: "villain_1", name: "شیطان 1", nameEn: "Devil 1", price: 30000, image: "assets/characters/villain_1.jpg" },
  { id: "villain_2", name: "شیطان 2", nameEn: "Devil 2", price: 15000, image: "assets/characters/villain_2.jpg" },
  { id: "villain_3", name: "شیطان 3", nameEn: "Devil 3", price: 10000, image: "assets/characters/villain_3.jpeg" },
  { id: "villain_4", name: "شیطان 4", nameEn: "Devil 4", price: 5000, image: "assets/characters/villain_4.jpeg" },
];

async function loadShop() {
  const data = await apiShop();
  renderUpgrades(data.upgrades);
  renderHeroes(data.heroes);
  renderVillains(data.villains);
  window.state.gems = data.gems;
  updateGemsUI();
}

async function buy(type, id) {
  const lang = getLang();
  const data = await apiBuy(type, id);

  if (!data.ok) {
    if (data.error === "max level") showToast(translations[lang].toast_max_level, "error");
    else if (data.error === "not enough score") showToast(translations[lang].toast_no_score, "error");
    else if (data.error === "not enough gems") showToast(translations[lang].toast_no_gems, "error");
    else showToast(data.error || "Error", "error");
    return;
  }

  if (data.score !== undefined) {
    window.state.score = data.score;
    document.getElementById("score").textContent = window.state.score;
  }
  if (data.max_food !== undefined) {
    window.state.maxFood = data.max_food;
    updateFoodUI();
  }
  if (data.gems !== undefined) {
    window.state.gems = data.gems;
    updateGemsUI();
  }
  if (data.hero_power !== undefined) {
    window.state.heroPower = data.hero_power;
    updateSpeedUI();
    if (window.state.heroPower > 0) startHeroTick();
  }

  showToast(translations[lang].toast_buy_success, "success");
  await loadShop();
}

async function unlockVillain(id) {
  const lang = getLang();
  const data = await apiBuy("villain_unlock", id);

  if (data.ok) {
    window.state.score = data.score;
    document.getElementById("score").textContent = window.state.score;
    showToast(translations[lang].toast_buy_success, "success");
    await loadShop();
  } else {
    if (data.error === "not enough score") showToast(translations[lang].toast_no_score, "error");
    else showToast(data.error || "Error", "error");
  }
}

function openDonateModal(villain) {
  window.state.currentVillain = villain;
  const lang = getLang();

  document.getElementById("donate-title").textContent =
    `${translations[lang].donate_to} ${lang === "fa" ? villain.name : villain.nameEn}`;
  document.getElementById("donate-balance").textContent =
    `${translations[lang].balance}: ${window.state.score.toLocaleString()}`;
  document.getElementById("donate-input").value = "";
  document.getElementById("donate-input").max = window.state.score;
  document.getElementById("donate-overlay").classList.add("show");
}

function closeDonateModal() {
  document.getElementById("donate-overlay").classList.remove("show");
  window.state.currentVillain = null;
}

async function confirmDonate() {
  if (!window.state.currentVillain) return;

  const amount = Math.floor(Number(document.getElementById("donate-input").value));
  const lang = getLang();

  if (!amount || amount <= 0) {
    showToast(translations[lang].toast_invalid_amount, "error");
    return;
  }
  if (amount > window.state.score) {
    showToast(translations[lang].toast_no_score, "error");
    return;
  }

  const data = await apiDonate(window.state.currentVillain.id, amount);

  if (data.ok) {
    window.state.score = data.score;
    document.getElementById("score").textContent = window.state.score;
    showToast(translations[lang].toast_donated, "success");
    closeDonateModal();
    await loadShop();
  } else {
    if (data.error === "not enough score") showToast(translations[lang].toast_no_score, "error");
    else showToast(data.error || "Error", "error");
  }
}