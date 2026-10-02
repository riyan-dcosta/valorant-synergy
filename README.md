# Valorant Team Synergy Planner

A static, single-page, bookmarkable site for building a Valorant 5-stack:
pick agents, see live role-balance/synergy recommendations, and get a
synergy rating + stats once your team is full. No backend — just HTML,
CSS and vanilla JS, deployed via GitHub Pages.

## Features

- **Fixed-height agent selection grid** at the top of the page, so the
  team/recommendations/stats below it never jump or shift, no matter what
  tab or how many agents are selected.
- **5 role filters**: All Agents (alphabetical), Initiators, Duelists,
  Sentinels, Controllers.
- **5 Team Slots**
  - Picking a new agent fills the next empty slot.
  - Click a slot to make it "active" (clearly highlighted) — the next
    agent you pick replaces that slot instead of filling the next empty
    one.
  - Picking an agent that's already on your team doesn't change any
    slot; instead that slot's border smoothly pulses/highlights for ~3
    seconds as feedback.
  - If all 5 slots are full and no slot is active, picking a new agent
    does nothing except show a toast telling you to select a slot to
    replace first.
  - Replacing a slot gives the new agent a fresh "selection order"
    timestamp; every other slot keeps its original order. Order only
    affects the recommendation seeding below, not slot position.
- **5 Recommended Agents**, directly below your team slots
  - Seeded primarily by the first agent you pick, then refined (but
    never fully overridden) as you add more agents — implemented as a
    recency-weighted scoring model (earliest pick has the strongest
    influence).
  - Scoring = curated pairwise synergy bonuses + role-balance scoring
    (rewards roles your comp is missing, penalizes roles you already have
    plenty of) + a small reference-win-rate tiebreaker.
  - Click a recommended agent to add it straight to your team (next
    empty slot, or the active slot if one is selected).
  - Recalculates every time a team slot changes.
- **Synergy & Stats panel**, below everything
  - Appears once all 5 slots are filled, and recalculates instantly on
    every subsequent change.
  - Shows an overall 0–100 synergy rating, role composition vs. the
    ideal 5-stack distribution, the notable curated synergy pairs present
    in your comp, and illustrative reference stats (average win rate,
    role-balance deviation).

## Agent Roulette (`roulette.html`)

A second page, linked from the header nav, for deciding which agent to
play this round:

- Reuses the same fixed-height agent grid and role filters as the
  planner, but clicking an agent toggles it in/out of the **roulette
  pool** instead of a team slot — any number of agents can be selected.
- The pool is rendered as a circular wheel of square agent tiles (no
  circular cropping, unlike the planner's avatars).
- **Spin the Wheel** runs a decelerating animation that jumps between
  pool tiles, recoloring the active tile's border on every tick, and
  settles on a randomly chosen winner — shown large in the "This Round"
  panel below.
- **Clear Pool** empties the current selection and resets the wheel.

## Data sources

- **Agent roster** (names, roles, portraits): fetched once from the
  public [valorant-api.com](https://valorant-api.com) resource (no auth,
  CORS-friendly) and cached in `localStorage` for 7 days, tagged with
  which resource it came from. If that fetch fails for any reason
  (offline, CORS, API down), the app transparently falls back to a
  bundled static roster (`js/data/agents.js`, initials-only avatars) and
  caches that instead — so it never re-tries a dead resource on every
  page load, and always has something correct to show.
- **Synergy ruleset & reference stats** (`js/data/synergy.js`): a static,
  hand-curated dataset baked into the app — ideal role-distribution
  targets, known strong duo synergies, and illustrative reference win
  rates. This is deliberately not a live API, since GitHub Pages has no
  backend to call one from securely/reliably; see "Recommendation
  algorithm" below.

## Recommendation algorithm

Rule-based weighted scoring (`js/recommend.js`), computed for every agent
not already on your team:

```
score(candidate) = synergyScore + roleBalanceScore + tiebreakScore
```

- `synergyScore` — sum of curated pairwise synergy bonuses between the
  candidate and each current teammate, weighted by `1 / rank` where
  `rank` is that teammate's chronological pick order (1 = first agent
  you selected). This is what makes recommendations "seeded primarily by
  the first agent, then refined" as more agents join.
- `roleBalanceScore` — `(idealCountForRole - currentCountForRole) * 10`,
  rewarding roles your comp is missing and penalizing roles that are
  already over-represented relative to the target 5-stack distribution
  (≈1.5 Duelist, 1.25 Initiator, 1.25 Controller, 1 Sentinel).
- `tiebreakScore` — a small nudge (`referenceWinRate * 0.1`) that only
  matters when synergy/role scores are equal.

The top 5 scored candidates become the Recommended Agents row, in rank
order.

## Running locally

This is a static site with no build step. Serve the folder with any
static file server, e.g.:

```sh
python3 -m http.server 8080
# then open http://localhost:8080
```

## Deployment (GitHub Pages)

A workflow at `.github/workflows/deploy-pages.yml` deploys the repository
root to GitHub Pages on every push to `main` using the official
`actions/configure-pages` + `actions/upload-pages-artifact` +
`actions/deploy-pages` actions. To enable it:

1. In the repo settings, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to `main` (or run the workflow manually) — the site will be
   published at `https://<owner>.github.io/valorant-synergy/`.

## Versioning

The app version is shown in the top-right corner of the header and is
defined in `js/version.js` (`window.VSP_APP_VERSION`). Bump this value on
every commit, and update the matching `?v=` cache-busting query string on
the `css/style.css` link in `index.html`, so browsers always pick up the
latest styles/scripts after a deploy.
