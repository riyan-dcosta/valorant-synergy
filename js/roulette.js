/**
 * Agent Roulette page.
 *
 * Flow:
 *   1. User browses/filters the agent grid (same roster + filter tabs as
 *      the Team Planner) and clicks any number of agents to add/remove
 *      them from the roulette pool (a Set of agent ids — no limit).
 *   2. The pool is rendered as a circular wheel of square agent tiles.
 *   3. Clicking "Spin the Wheel" runs a decelerating highlight animation
 *      that jumps tile-to-tile around the wheel, recoloring the active
 *      tile's border on every tick, and finally settles on a randomly
 *      chosen winner — the agent to play this round.
 */
(function () {
  const state = {
    allAgents: [],
    pool: new Set(),
    currentFilter: "all",
    spinning: false,
  };

  const el = {
    agentGrid: document.getElementById("agentGrid"),
    poolCount: document.getElementById("poolCount"),
    clearPoolBtn: document.getElementById("clearPoolBtn"),
    spinBtn: document.getElementById("spinBtn"),
    rouletteWheel: document.getElementById("rouletteWheel"),
    winnerDisplay: document.getElementById("winnerDisplay"),
    toast: document.getElementById("toast"),
    dataSourceBadge: document.getElementById("dataSourceBadge"),
    appVersion: document.getElementById("appVersion"),
    tabs: Array.from(document.querySelectorAll(".tab")),
  };

  if (el.appVersion) {
    el.appVersion.textContent = `v${window.VSP_APP_VERSION || "0.0.0"}`;
  }

  // Border colors cycled through while the wheel is spinning.
  const SPIN_COLORS = [
    "#ff4655", "#ffd24a", "#5fae7a", "#4f7cac",
    "#6f4fd1", "#2ab5c9", "#d1622a", "#8a2ad1",
  ];

  let toastTimer = null;
  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("visible"), 3000);
  }

  function agentById(id) {
    return state.allAgents.find((a) => a.id === id) || null;
  }

  function initials(name) {
    return name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function agentAvatarHTML(agent) {
    if (agent.icon) {
      return `<img src="${agent.icon}" alt="" loading="lazy" data-agent-id="${agent.id}" onerror="window.VSP_handleImgError(this)" />`;
    }
    return `<div class="avatar-fallback" style="background:${agent.color}">${initials(agent.name)}</div>`;
  }

  window.VSP_handleImgError = function (imgEl) {
    const agent = agentById(imgEl.dataset.agentId);
    if (!agent) return;
    const fallback = document.createElement("div");
    fallback.className = "avatar-fallback";
    fallback.style.background = agent.color;
    fallback.textContent = initials(agent.name);
    imgEl.replaceWith(fallback);
  };

  // ---------------- Agent selection grid (top, fixed height) ----------------

  function renderAgentGrid() {
    const filter = state.currentFilter;
    let agents = state.allAgents.slice();
    if (filter !== "all") {
      agents = agents.filter((a) => a.role === filter);
    }
    agents.sort((a, b) => a.name.localeCompare(b.name));

    el.agentGrid.innerHTML = agents
      .map((a) => {
        const inPool = state.pool.has(a.id);
        return `
          <button class="agent-tile${inPool ? " in-pool" : ""}" role="listitem"
                  data-agent-id="${a.id}" title="${a.name} — ${a.role}" aria-pressed="${inPool}">
            ${agentAvatarHTML(a)}
            <span class="agent-name">${a.name}</span>
            <span class="agent-role role-${a.role.toLowerCase()}">${a.role}</span>
          </button>`;
      })
      .join("");
  }

  el.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      el.tabs.forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      state.currentFilter = tab.dataset.filter;
      renderAgentGrid();
    });
  });

  el.agentGrid.addEventListener("click", (e) => {
    const tile = e.target.closest(".agent-tile");
    if (!tile) return;
    if (state.spinning) {
      showToast("Wait for the wheel to stop spinning.");
      return;
    }
    togglePoolAgent(tile.dataset.agentId);
  });

  // ---------------- Roulette pool + wheel ----------------

  function togglePoolAgent(agentId) {
    if (state.pool.has(agentId)) {
      state.pool.delete(agentId);
    } else {
      state.pool.add(agentId);
    }
    renderAgentGrid();
    renderWheel();
    renderPoolCount();
  }

  function renderPoolCount() {
    const n = state.pool.size;
    el.poolCount.textContent = `${n} selected`;
  }

  el.clearPoolBtn.addEventListener("click", () => {
    if (state.spinning) return;
    state.pool.clear();
    renderAgentGrid();
    renderWheel();
    renderPoolCount();
    resetWinner();
  });

  function resetWinner() {
    el.winnerDisplay.innerHTML = `<p class="placeholder">Spin the wheel to find out.</p>`;
  }

  function renderWheel() {
    const poolArr = Array.from(state.pool);

    if (poolArr.length < 2) {
      el.rouletteWheel.innerHTML = `<p class="placeholder" id="wheelPlaceholder">Select at least 2 agents above to build your roulette.</p>`;
      el.spinBtn.disabled = true;
      return;
    }

    el.spinBtn.disabled = state.spinning;

    const radius = poolArr.length <= 6 ? 120 : poolArr.length <= 10 ? 145 : 165;
    const size = Math.round(radius * 2 + 88);
    const cx = size / 2;
    const cy = size / 2;

    const tilesHTML = poolArr
      .map((id, i) => {
        const agent = agentById(id);
        if (!agent) return "";
        const angle = (i / poolArr.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        return `
          <div class="wheel-tile" data-agent-id="${agent.id}" style="left:${x}px; top:${y}px;">
            ${agentAvatarHTML(agent)}
            <span class="wheel-tile-name">${agent.name}</span>
          </div>`;
      })
      .join("");

    el.rouletteWheel.innerHTML = `
      <div class="wheel-circle" style="width:${size}px; height:${size}px;">
        <div class="wheel-pointer" aria-hidden="true"></div>
        <div class="wheel-hub"><span>${poolArr.length}</span></div>
        ${tilesHTML}
      </div>`;
  }

  function setWheelTileHighlight(tileEl, color) {
    tileEl.classList.add("wheel-highlight");
    tileEl.style.setProperty("--wheel-border", color);
  }

  function clearWheelTileHighlight(tileEl) {
    tileEl.classList.remove("wheel-highlight");
    tileEl.style.removeProperty("--wheel-border");
  }

  function spin() {
    if (state.spinning) return;
    const poolArr = Array.from(state.pool);
    if (poolArr.length < 2) return;

    const tiles = Array.from(el.rouletteWheel.querySelectorAll(".wheel-tile"));
    if (tiles.length !== poolArr.length) return;

    state.spinning = true;
    el.spinBtn.disabled = true;
    el.clearPoolBtn.disabled = true;
    resetWinner();

    const winnerIndex = Math.floor(Math.random() * poolArr.length);
    const loops = 4 + Math.floor(Math.random() * 3); // 4-6 full laps
    const sequenceLength = loops * poolArr.length + winnerIndex + 1;

    let tick = 0;
    let prevEl = null;

    function step() {
      const idx = tick % poolArr.length;
      const tileEl = tiles[idx];

      if (prevEl) clearWheelTileHighlight(prevEl);
      setWheelTileHighlight(tileEl, SPIN_COLORS[tick % SPIN_COLORS.length]);
      prevEl = tileEl;

      tick++;
      if (tick < sequenceLength) {
        const progress = tick / sequenceLength;
        const delay = 45 + Math.pow(progress, 3) * 360; // ease-out: slows near the end
        setTimeout(step, delay);
      } else {
        finishSpin(tileEl, poolArr[winnerIndex]);
      }
    }

    step();
  }

  function finishSpin(winnerTileEl, winnerAgentId) {
    clearWheelTileHighlight(winnerTileEl);
    winnerTileEl.classList.add("wheel-winner");

    const agent = agentById(winnerAgentId);
    if (agent) {
      el.winnerDisplay.innerHTML = `
        <div class="winner-card">
          ${agentAvatarHTML(agent)}
          <div class="winner-name">${agent.name}</div>
          <div class="agent-role role-${agent.role.toLowerCase()}">${agent.role}</div>
        </div>`;
    }

    state.spinning = false;
    el.spinBtn.disabled = false;
    el.clearPoolBtn.disabled = false;
  }

  el.spinBtn.addEventListener("click", spin);

  // ---------------- Orchestration ----------------

  async function init() {
    const { agents, source } = await window.VSP_DataSource.loadAgentRoster();
    state.allAgents = agents;
    el.dataSourceBadge.textContent =
      source === "valorant-api" ? "live roster (cached)" : "offline roster (bundled)";
    el.dataSourceBadge.title =
      source === "valorant-api"
        ? "Fetched once from valorant-api.com and cached in localStorage."
        : "Live resource unavailable; using the bundled static dataset.";

    renderAgentGrid();
    renderWheel();
    renderPoolCount();
  }

  init();
})();
