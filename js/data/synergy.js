/**
 * Curated synergy ruleset + reference stats.
 *
 * This is intentionally a static, hand-curated dataset baked into the app
 * (per project decision: no live backend / no server-side scoring logic).
 * It powers:
 *   - pairwise synergy bonuses used by the recommendation engine
 *   - the ideal role-distribution target used for role-balance scoring
 *   - illustrative reference stats shown in the Synergy & Stats panel
 *
 * Agent roster + portrait data is a separate concern: see data-source.js,
 * which fetches the live roster once from a public resource and caches it,
 * falling back to agents.js when offline.
 */
window.VALORANT_SYNERGY = {
  // Target role distribution for a "well rounded" 5-stack. Used to reward
  // recommendations that move the team's composition closer to this mix.
  idealRoleTargets: {
    Duelist: 1.5,
    Initiator: 1.25,
    Controller: 1.25,
    Sentinel: 1,
  },

  // Known strong duo synergies (symmetric). Keys are lowercase agent ids
  // joined with "+" in alphabetical order. Values are bonus points added
  // to the recommendation score when both agents are present.
  pairBonuses: {
    "breach+jett": 8,
    "breach+raze": 7,
    "jett+omen": 6,
    "killjoy+viper": 7,
    "sova+jett": 7,
    "sova+raze": 6,
    "fade+raze": 6,
    "skye+raze": 6,
    "kayo+jett": 6,
    "astra+raze": 5,
    "brimstone+raze": 6,
    "viper+raze": 5,
    "cypher+killjoy": 6,
    "cypher+sova": 5,
    "harbor+raze": 5,
    "omen+viper": 5,
    "gekko+raze": 5,
    "sage+jett": 4,
    "sage+reyna": 4,
    "chamber+viper": 5,
    "neon+breach": 5,
    "skye+breach": 4,
    "kayo+breach": 4,
    "iso+kayo": 4,
    "deadlock+sova": 4,
    "vyse+viper": 4,
    "tejo+raze": 4,
    "clove+raze": 5,
    "waylay+jett": 4,
  },

  // Illustrative / reference stats. These are NOT live data; they exist to
  // give the stats panel believable supplementary context. Numbers are
  // approximate community-known tendencies, intentionally coarse.
  referenceWinRates: {
    jett: 49, raze: 48, reyna: 47, phoenix: 46, neon: 47, yoru: 46, iso: 47, waylay: 47,
    sova: 51, breach: 50, skye: 50, kayo: 49, fade: 51, gekko: 49, tejo: 48,
    killjoy: 51, cypher: 50, sage: 51, chamber: 50, deadlock: 49, vyse: 50,
    omen: 51, brimstone: 50, viper: 51, astra: 49, harbor: 49, clove: 50,
  },

  roleDescriptions: {
    Duelist: "Entry fraggers that create space and get first picks.",
    Initiator: "Gather information and disrupt the enemy before engagements.",
    Controller: "Control sightlines and area with smokes/territory denial.",
    Sentinel: "Hold angles, watch flanks, and lock down sites.",
  },
};
