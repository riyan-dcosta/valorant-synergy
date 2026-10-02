/**
 * Recommendation engine.
 *
 * Rule-based weighted scoring model (documented in README under
 * "Recommendation algorithm"):
 *
 *   score(candidate) = synergyScore + roleBalanceScore + tiebreakScore
 *
 * - synergyScore: sum of curated pairwise synergy bonuses between the
 *   candidate and every agent currently on the team, weighted by how
 *   early that teammate was selected (earliest pick weighted most - this
 *   is what "seeded primarily by the first agent" means in practice).
 * - roleBalanceScore: rewards candidates whose role is currently under
 *   the ideal 5-stack role distribution, and penalizes roles that are
 *   already over-represented.
 * - tiebreakScore: small nudge from illustrative reference win rates, only
 *   meaningful when the other two scores are equal/near-equal.
 */
(function () {
  function pairKey(idA, idB) {
    return [idA, idB].sort().join("+");
  }

  function recencyWeight(rank) {
    // rank is 1-based, 1 = earliest selected. Harmonic falloff so the
    // first pick dominates the seed, later picks still refine it.
    return 1 / rank;
  }

  function roleCounts(occupiedAgents) {
    const counts = { Duelist: 0, Initiator: 0, Sentinel: 0, Controller: 0 };
    occupiedAgents.forEach((a) => {
      if (a.role in counts) counts[a.role] += 1;
    });
    return counts;
  }

  /**
   * @param {Array<{agentId:string, order:number}|null>} teamSlots
   * @param {Array} allAgents - full roster (with id, name, role)
   * @param {number} count - how many recommendations to return
   */
  function computeRecommendations(teamSlots, allAgents, count) {
    const byId = Object.fromEntries(allAgents.map((a) => [a.id, a]));
    const occupied = teamSlots
      .filter(Boolean)
      .map((s) => ({ ...s, agent: byId[s.agentId] }))
      .filter((s) => s.agent)
      .sort((a, b) => a.order - b.order); // chronological: earliest first

    if (occupied.length === 0) return [];

    const teamIds = new Set(occupied.map((o) => o.agentId));
    const counts = roleCounts(occupied.map((o) => o.agent));
    const targets = window.VALORANT_SYNERGY.idealRoleTargets;
    const pairBonuses = window.VALORANT_SYNERGY.pairBonuses;
    const refWinRates = window.VALORANT_SYNERGY.referenceWinRates;

    const candidates = allAgents.filter((a) => !teamIds.has(a.id));

    const scored = candidates.map((candidate) => {
      let synergyScore = 0;
      occupied.forEach((teammate, idx) => {
        const rank = idx + 1; // 1 = earliest pick
        const key = pairKey(candidate.id, teammate.agentId);
        const bonus = pairBonuses[key] || 0;
        synergyScore += bonus * recencyWeight(rank);
      });

      const target = targets[candidate.role] ?? 1;
      const current = counts[candidate.role] ?? 0;
      const deficit = target - current;
      const roleBalanceScore = deficit * 10;

      const tiebreakScore = (refWinRates[candidate.id] || 45) * 0.1;

      const total = synergyScore + roleBalanceScore + tiebreakScore;
      return { agent: candidate, score: total };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, count).map((s) => s.agent);
  }

  window.VSP_Recommend = { computeRecommendations };
})();
