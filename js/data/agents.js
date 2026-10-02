/**
 * Static fallback agent dataset.
 *
 * This bundled dataset is used when the app cannot reach the live
 * valorant-api.com resource (first load, offline, CORS/network failure).
 * It is intentionally free of external image URLs so the UI always has
 * something correct to render (initials avatars) even with zero network
 * access. When the live resource IS reachable, `data-source.js` fetches
 * richer data (official splash/icon images) and merges it on top of this
 * list, then caches the result in localStorage so subsequent visits don't
 * re-fetch unless the cache is stale or explicitly refreshed.
 *
 * role must be one of: "Duelist" | "Initiator" | "Sentinel" | "Controller"
 */
window.VALORANT_AGENTS_FALLBACK = [
  { id: "astra", name: "Astra", role: "Controller", color: "#6f4fd1" },
  { id: "breach", name: "Breach", role: "Initiator", color: "#c0742a" },
  { id: "brimstone", name: "Brimstone", role: "Controller", color: "#b5651d" },
  { id: "chamber", name: "Chamber", role: "Sentinel", color: "#c9a24b" },
  { id: "clove", name: "Clove", role: "Controller", color: "#7fd6c2" },
  { id: "cypher", name: "Cypher", role: "Sentinel", color: "#8a8a8a" },
  { id: "deadlock", name: "Deadlock", role: "Sentinel", color: "#4f7cac" },
  { id: "fade", name: "Fade", role: "Initiator", color: "#4a4e69" },
  { id: "gekko", name: "Gekko", role: "Initiator", color: "#6aa84f" },
  { id: "harbor", name: "Harbor", role: "Controller", color: "#2a7f8f" },
  { id: "iso", name: "Iso", role: "Duelist", color: "#5b5f97" },
  { id: "jett", name: "Jett", role: "Duelist", color: "#7fd1d1" },
  { id: "kayo", name: "KAY/O", role: "Initiator", color: "#9aa0a6" },
  { id: "killjoy", name: "Killjoy", role: "Sentinel", color: "#c9b92a" },
  { id: "neon", name: "Neon", role: "Duelist", color: "#2a6fc9" },
  { id: "omen", name: "Omen", role: "Controller", color: "#3a3a5c" },
  { id: "phoenix", name: "Phoenix", role: "Duelist", color: "#d1622a" },
  { id: "raze", name: "Raze", role: "Duelist", color: "#d1a52a" },
  { id: "reyna", name: "Reyna", role: "Duelist", color: "#8a2ad1" },
  { id: "sage", name: "Sage", role: "Sentinel", color: "#5fae7a" },
  { id: "skye", name: "Skye", role: "Initiator", color: "#7a9a4a" },
  { id: "sova", name: "Sova", role: "Initiator", color: "#4a6a9a" },
  { id: "tejo", name: "Tejo", role: "Initiator", color: "#c97a4a" },
  { id: "viper", name: "Viper", role: "Controller", color: "#4a9a4a" },
  { id: "vyse", name: "Vyse", role: "Sentinel", color: "#8a5a9a" },
  { id: "waylay", name: "Waylay", role: "Duelist", color: "#2ab5c9" },
  { id: "yoru", name: "Yoru", role: "Duelist", color: "#2a4fd1" },
];
