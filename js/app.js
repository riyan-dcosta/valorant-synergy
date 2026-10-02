/**
 * App bootstrap + UI wiring for the Valorant Team Synergy Planner.
 *
 * State model:
 *   - teamSlots: Array(5) of either null or { agentId, order }.
 *     `order` is a monotonically increasing counter used ONLY for
 *     recommendation recency-weighting (see recommend.js). Replacing a
 *     slot gives the newly placed agent a fresh `order`; every other
 *     slot's `order` is left untouched, exactly as specced.
 *   - activeSlotIndex: index of the slot the user explicitly clicked
 *     (or null). The next agent pick replaces that slot; after a
 *     replacement the active state clears.
 */
(function () {
  const SLOT_COUNT = 5;

  const state = {
    allAgents: [],
    dataSource: null,
    teamSlots: Array(SLOT_COUNT).fill(null),
    activeSlotIndex: null,
    orderCounter: 0,
    currentFilter: "all",
  };

  const el = {
    agentGrid: document.getElementById("agentGrid"),
    teamSlots: document.getElementById("teamSlots"),
    recommendedSlots: document.getElementById("recommendedSlots"),
    synergyContent: document.getElementById("synergyContent"),
    toast: document.getElementById("toast"),
    dataSourceBadge: document.getElementById("dataSourceBadge"),
    tabs: Array.from(document.querySelectorAll(".tab")),
  };

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
        const isOnTeam = state.teamSlots.some((s) => s && s.agentId === a.id);
        return `
          <button class="agent-tile${isOnTeam ? " on-team" : ""}" role="listitem"
                  data-agent-id="${a.id}" title="${a.name} — ${a.role}">
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
    handleAgentPicked(tile.dataset.agentId);
  });

  // ---------------- Team slots ----------------

  function emptySlotIndex() {
    return state.teamSlots.findIndex((s) => s === null);
  }

  function slotIndexForAgent(agentId) {
    return state.teamSlots.findIndex((s) => s && s.agentId === agentId);
  }

  function handleAgentPicked(agentId) {
    const existingIndex = slotIndexForAgent(agentId);
    if (existingIndex !== -1) {
      flashDuplicate(existingIndex);
      return;
    }

    if (state.activeSlotIndex !== null) {
      state.teamSlots[state.activeSlotIndex] = {
        agentId,
        order: ++state.orderCounter,
      };
      state.activeSlotIndex = null;
      afterTeamChange();
      return;
    }

    const empty = emptySlotIndex();
    if (empty !== -1) {
      state.teamSlots[empty] = { agentId, order: ++state.orderCounter };
      afterTeamChange();
      return;
    }

    // All 5 slots full and no slot actively selected: do nothing (option a)
    // + surface an error/toast (option b), per spec.
    showToast("All 5 slots are full. Click a slot first to replace it.");
  }

  function flashDuplicate(slotIndex) {
    const slotEl = el.teamSlots.children[slotIndex];
    if (!slotEl) return;
    slotEl.classList.remove("duplicate-highlight");
    // force reflow so the animation can restart if clicked again quickly
    void slotEl.offsetWidth;
    slotEl.classList.add("duplicate-highlight");
    setTimeout(() => slotEl.classList.remove("duplicate-highlight"), 3000);
  }

  function handleSlotClick(index) {
    state.activeSlotIndex = state.activeSlotIndex === index ? null : index;
    renderTeamSlots();
  }

  function renderTeamSlots() {
    el.teamSlots.innerHTML = "";
    state.teamSlots.forEach((slot, i) => {
      const wrapper = document.createElement("button");
      wrapper.className = "slot team-slot";
      wrapper.classList.toggle("active", state.activeSlotIndex === i);
      wrapper.classList.toggle("filled", !!slot);
      wrapper.classList.toggle("empty", !slot);
      wrapper.setAttribute("aria-label", slot ? `Slot ${i + 1}: ${agentById(slot.agentId)?.name}` : `Slot ${i + 1}: empty`);

      if (slot) {
        const agent = agentById(slot.agentId);
        if (agent) {
          wrapper.innerHTML = `${agentAvatarHTML(agent)}<span class="agent-name">${agent.name}</span>`;
        }
      } else {
        wrapper.innerHTML = `<span class="slot-placeholder">${i + 1}</span>`;
      }

      wrapper.addEventListener("click", () => handleSlotClick(i));
      el.teamSlots.appendChild(wrapper);
    });
  }

  // ---------------- Recommended agents row ----------------

  function renderRecommended() {
    const recs = window.VSP_Recommend.computeRecommendations(state.teamSlots, state.allAgents, SLOT_COUNT);
    el.recommendedSlots.innerHTML = "";
    for (let i = 0; i < SLOT_COUNT; i++) {
      const agent = recs[i];
      const div = document.createElement("div");
      div.className = "slot recommended-slot" + (agent ? " filled" : " empty");
      if (agent) {
        div.innerHTML = `${agentAvatarHTML(agent)}<span class="agent-name">${agent.name}</span>`;
        div.title = "Click to add to your team";
        div.addEventListener("click", () => handleAgentPicked(agent.id));
        div.classList.add("clickable");
      } else {
        div.innerHTML = `<span class="slot-placeholder">—</span>`;
      }
      el.recommendedSlots.appendChild(div);
    }
  }

  // ---------------- Synergy & Stats panel ----------------

  function pairKey(a, b) {
    return [a, b].sort().join("+");
  }

  function renderSynergyPanel() {
    const occupied = state.teamSlots.filter(Boolean);
    if (occupied.length < SLOT_COUNT) {
      el.synergyContent.innerHTML = `<p class="placeholder">Fill all 5 team slots to see your synergy rating and stats. (${occupied.length}/5)</p>`;
      return;
    }

    const agents = occupied.map((s) => agentById(s.agentId)).filter(Boolean);
    const synergy = window.VALORANT_SYNERGY;

    // Role distribution
    const counts = { Duelist: 0, Initiator: 0, Sentinel: 0, Controller: 0 };
    agents.forEach((a) => (counts[a.role] = (counts[a.role] || 0) + 1));
    const targets = synergy.idealRoleTargets;
    const roleDistance = Object.keys(targets).reduce(
      (sum, role) => sum + Math.abs((counts[role] || 0) - targets[role]),
      0
    );

    // Pairwise synergy (all C(5,2) combinations)
    const pairs = [];
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const key = pairKey(agents[i].id, agents[j].id);
        const bonus = synergy.pairBonuses[key] || 0;
        if (bonus > 0) pairs.push({ a: agents[i], b: agents[j], bonus });
      }
    }
    pairs.sort((a, b) => b.bonus - a.bonus);
    const totalPairBonus = pairs.reduce((s, p) => s + p.bonus, 0);

    const avgWinRate =
      agents.reduce((s, a) => s + (synergy.referenceWinRates[a.id] || 49), 0) / agents.length;

    const rating = Math.max(
      0,
      Math.min(100, Math.round(55 + totalPairBonus * 1.5 - roleDistance * 8 + (avgWinRate - 49) * 2))
    );

    const roleRows = Object.keys(targets)
      .map(
        (role) => `
        <li>
          <span class="role-label role-${role.toLowerCase()}">${role}</span>
          <span>${counts[role] || 0} / ideal ~${targets[role]}</span>
        </li>`
      )
      .join("");

    const pairRows = pairs.length
      ? pairs
          .map((p) => `<li>${p.a.name} + ${p.b.name} <span class="bonus">+${p.bonus}</span></li>`)
          .join("")
      : `<li class="placeholder">No notable curated synergy pairs in this comp.</li>`;

    el.synergyContent.innerHTML = `
      <div class="synergy-rating">
        <div class="rating-number">${rating}</div>
        <div class="rating-label">Team Synergy Rating</div>
      </div>
      <div class="synergy-columns">
        <div>
          <h3>Role Composition</h3>
          <ul class="role-list">${roleRows}</ul>
        </div>
        <div>
          <h3>Notable Pair Synergies</h3>
          <ul class="pair-list">${pairRows}</ul>
        </div>
        <div>
          <h3>Reference Stats</h3>
          <ul class="stat-list">
            <li>Avg. reference win rate: <strong>${avgWinRate.toFixed(1)}%</strong></li>
            <li>Curated synergy pairs found: <strong>${pairs.length}</strong></li>
            <li>Role-balance deviation: <strong>${roleDistance.toFixed(2)}</strong> (lower is better)</li>
          </ul>
          <p class="disclaimer">Reference stats are a static, illustrative dataset bundled with the app (not live data).</p>
        </div>
      </div>`;
  }

  // ---------------- Orchestration ----------------

  function afterTeamChange() {
    renderAgentGrid();
    renderTeamSlots();
    renderRecommended();
    renderSynergyPanel();
  }

  async function init() {
    const { agents, source } = await window.VSP_DataSource.loadAgentRoster();
    state.allAgents = agents;
    state.dataSource = source;
    el.dataSourceBadge.textContent =
      source === "valorant-api" ? "live roster (cached)" : "offline roster (bundled)";
    el.dataSourceBadge.title =
      source === "valorant-api"
        ? "Fetched once from valorant-api.com and cached in localStorage."
        : "Live resource unavailable; using the bundled static dataset.";

    renderAgentGrid();
    renderTeamSlots();
    renderRecommended();
    renderSynergyPanel();
  }

  init();
})();
