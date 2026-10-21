let toastTimer = null;

function updateFoodUI() {
  const pct = (window.state.food / window.state.maxFood) * 100;
  document.getElementById("food-fill").style.width = `${pct}%`;
  document.getElementById("food-text").textContent = `🍔 ${Math.floor(window.state.food)} / ${window.state.maxFood}`;
}

function updateGemsUI() {
  document.getElementById("gems").textContent = `💎 ${window.state.gems}`;
}

function updateSpeedUI() {
  const el = document.getElementById("speed-display");
  if (!el) return;
  if (window.state.heroPower > 0) {
    el.textContent = `⚡ ${window.state.heroPower}/s`;
    el.style.display = "inline-block";
  } else {
    el.style.display = "none";
  }
}

function showToast(message, type) {
  const el = document.getElementById("toast");
  el.textContent = "";
  const icon = document.createElement("span");
  icon.textContent = type === "success" ? "✓" : "✕";
  el.appendChild(icon);
  el.appendChild(document.createTextNode(" " + message));
  el.className = `toast ${type} show`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2500);
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

function renderLeaderboard(top) {
  const lang = getLang();
  const medals = ["🥇", "🥈", "🥉"];
  const list = document.getElementById("stats-list");
  list.innerHTML = "";

  top.forEach((user, i) => {
    const row = document.createElement("div");
    row.className = "stats-row";

    const rank = document.createElement("div");
    rank.className = "stats-rank" + (i < 3 ? " medal" : "");
    rank.textContent = i < 3 ? medals[i] : i + 1;

    const name = document.createElement("div");
    name.className = "stats-name";
    name.textContent = user.username ? "@" + user.username : translations[lang].no_username;

    const score = document.createElement("div");
    score.className = "stats-score";
    score.textContent = user.score.toLocaleString();

    row.appendChild(rank);
    row.appendChild(name);
    row.appendChild(score);
    list.appendChild(row);
  });
}

function renderUpgrades(upgrades) {
  const lang = getLang();
  const container = document.getElementById("shop-upgrades");
  container.innerHTML = "";

  upgrades.forEach((up) => {
    const isMax = up.level >= up.max_level;
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
    info.appendChild(title);

    if (!isMax) {
      const desc = document.createElement("div");
      desc.className = "shop-card-desc";
      desc.textContent = `${up.current} → ${up.next}`;
      info.appendChild(desc);
    }

    const btn = document.createElement("button");
    btn.className = "shop-card-btn";
    if (isMax) {
      btn.textContent = translations[lang].max_level;
      btn.disabled = true;
    } else {
      btn.textContent = `${translations[lang].buy} ${up.price}`;
      btn.addEventListener("click", () => buy("food", null));
    }

    card.appendChild(icon);
    card.appendChild(info);
    card.appendChild(btn);
    container.appendChild(card);
  });
}

function renderHeroes(heroes) {
  const lang = getLang();
  const container = document.getElementById("shop-heroes");
  container.innerHTML = "";

  heroes.forEach((h) => {
    const isMax = h.level >= h.max_level;
    const displayPower = isMax ? (h.id === 1 ? 10 : 4) : h.power;

    const card = document.createElement("div");
    card.className = "shop-card";

    const icon = document.createElement("div");
    icon.className = "shop-card-icon";
    icon.textContent = h.id === 1 ? "🇮🇱" : "🇺🇸";

    const info = document.createElement("div");
    info.className = "shop-card-info";

    const title = document.createElement("div");
    title.className = "shop-card-title";
    title.textContent = `${h.id === 1 ? translations[lang].hero1 : translations[lang].hero2} (Lv ${h.level})`;

    const desc = document.createElement("div");
    desc.className = "shop-card-desc";
    desc.textContent = `${displayPower}/s`;

    info.appendChild(title);
    info.appendChild(desc);

    const btn = document.createElement("button");
    btn.className = "shop-card-btn";
    if (isMax) {
      btn.textContent = translations[lang].max_level;
      btn.disabled = true;
    } else {
      btn.textContent = `💎 ${h.price}`;
      btn.addEventListener("click", () => buy("hero", h.id));
    }

    card.appendChild(icon);
    card.appendChild(info);
    card.appendChild(btn);
    container.appendChild(card);
  });
}

function renderVillains(villains) {
  const lang = getLang();
  const container = document.getElementById("shop-grid");
  container.innerHTML = "";

  VILLAINS.forEach((v) => {
    const data = (villains || []).find((x) => x.id === v.id) || { amount: 0, unlocked: 0, price: v.price };

    const card = document.createElement("div");
    card.className = "char-card";

    const img = document.createElement("img");
    img.className = "char-card-img";
    img.src = v.image;
    img.alt = lang === "fa" ? v.name : v.nameEn;
    img.loading = "lazy";

    const name = document.createElement("div");
    name.className = "char-card-name";
    name.textContent = lang === "fa" ? v.name : v.nameEn;

    card.appendChild(img);
    card.appendChild(name);

    if (!data.unlocked) {
      const btn = document.createElement("button");
      btn.className = "char-card-btn";
      btn.textContent = `${translations[lang].unlock} ${(data.price || v.price).toLocaleString()}`;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        unlockVillain(v.id);
      });
      card.appendChild(btn);
    } else {
      const info = document.createElement("div");
      info.className = "char-card-info";
      info.textContent = `💩 ${data.amount.toLocaleString()}`;
      card.appendChild(info);

      const btn = document.createElement("button");
      btn.className = "char-card-btn";
      btn.textContent = translations[lang].donate;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openDonateModal(v);
      });
      card.appendChild(btn);
    }

    container.appendChild(card);
  });
}