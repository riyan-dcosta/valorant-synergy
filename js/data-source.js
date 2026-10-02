/**
 * Agent roster data source.
 *
 * Strategy ("call it once and store it"):
 *   1. On load, check localStorage for a cached roster + the resource it
 *      came from.
 *   2. If the cache is missing/stale (> CACHE_TTL_MS old) or was explicitly
 *      invalidated, attempt to fetch fresh data from the primary public
 *      resource (valorant-api.com — a free, CORS-friendly, no-auth API).
 *   3. If that fetch fails for any reason (offline, CORS, API down), fall
 *      back to the bundled static dataset (js/data/agents.js) instead, and
 *      cache THAT result tagged with its source so we don't keep retrying
 *      a dead resource on every page load this session.
 *   4. Whatever succeeded gets written to localStorage with a timestamp and
 *      a `source` tag ("valorant-api" | "fallback-bundle") so future loads
 *      can pull from the same resource again, or try a different one if the
 *      cached source was the fallback.
 */
(function () {
  const CACHE_KEY = "vsp.agentRoster.v1";
  const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
  const PRIMARY_RESOURCE_URL = "https://valorant-api.com/v1/agents?isPlayableCharacter=true";

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.agents) || !parsed.fetchedAt) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function writeCache(agents, source) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ agents, source, fetchedAt: Date.now() })
      );
    } catch (e) {
      // localStorage unavailable (private mode / quota) - safe to ignore,
      // app just re-fetches/falls back next load.
    }
  }

  function normalizeFallback() {
    return (window.VALORANT_AGENTS_FALLBACK || []).map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role,
      color: a.color,
      icon: null, // no external image for the bundled fallback dataset
    }));
  }

  function normalizeApiPayload(json) {
    if (!json || !Array.isArray(json.data)) throw new Error("Unexpected payload shape");
    const roleMap = {
      Duelist: "Duelist",
      Initiator: "Initiator",
      Sentinel: "Sentinel",
      Controller: "Controller",
    };
    const fallbackColors = window.VALORANT_AGENTS_FALLBACK || [];
    const colorById = Object.fromEntries(fallbackColors.map((a) => [a.id, a.color]));

    const agents = json.data
      .filter((a) => a.characterTags !== null || true)
      .map((a) => {
        const roleName = a.role && roleMap[a.role.displayName] ? a.role.displayName : null;
        const id = String(a.displayName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        return {
          id,
          name: a.displayName,
          role: roleName,
          color: colorById[id] || "#555",
          icon: a.displayIconSmall || a.displayIcon || null,
        };
      })
      .filter((a) => a.role && a.name);

    if (agents.length === 0) throw new Error("No playable agents parsed from API payload");
    return agents;
  }

  async function fetchPrimaryResource() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(PRIMARY_RESOURCE_URL, { signal: controller.signal });
      if (!res.ok) throw new Error("Bad response: " + res.status);
      const json = await res.json();
      return normalizeApiPayload(json);
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Resolve the agent roster, preferring a fresh/cached live resource and
   * transparently falling back to the bundled static dataset.
   * Returns { agents, source, fetchedAt }.
   */
  async function loadAgentRoster({ forceRefresh = false } = {}) {
    const cached = readCache();
    const isFresh = cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS;

    if (!forceRefresh && isFresh) {
      return cached;
    }

    // Only retry the live resource if we've never successfully cached it,
    // the cache expired, or the caller explicitly asked for a refresh.
    try {
      const agents = await fetchPrimaryResource();
      const result = { agents, source: "valorant-api", fetchedAt: Date.now() };
      writeCache(agents, "valorant-api");
      return result;
    } catch (err) {
      const agents = normalizeFallback();
      const result = { agents, source: "fallback-bundle", fetchedAt: Date.now() };
      writeCache(agents, "fallback-bundle");
      return result;
    }
  }

  window.VSP_DataSource = { loadAgentRoster };
})();
