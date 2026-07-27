# Neighbourhood explore perf run — 2026-07-28

**Environment:** local dev (`rental-fe` :5173, `rental-be` :3000)  
**Browser:** Chrome Incognito + React DevTools Profiler  
**Viewport:** Pixel 7 emulation  
**Goal:** Component render isolation (one interaction → related components only)

**Automated regression:** neighbourhood explore unit tests → **19/19 passed**

## Results summary

| # | Scenario | Status | Notes |
| --- | --- | --- | --- |
| 1 | Open Explore modal | **Pass** | 7 commits; peak render ~52 ms (commit 1), ~30 ms (commit 6 map mount) |
| 2 | Category tap (Public Transport) | **Pass** | 2 commits; ~30 ms; caused by `NeighbourhoodExploreProvider` |
| 3 | Main map isolation | **Pass** | `MapView` gray / did not client-render on both scenarios |
| 4 | Radius change | **Defer** | API-bound; profile separately if latency matters |
| 5 | Large/truncated dataset | **Defer** | Re-profile when a heavy building is identified |

## Profiler details

### Open Explore modal

| Commit | Render | Caused by |
| ---: | ---: | --- |
| 1 | 51.8 ms | `NeighbourhoodExploreDialogProvider` |
| 2 | 30.3 ms | (child updates; `BuildingDetailPage` ~2.4 ms) |
| 6 | 30.3 ms | `Map`, `Circle`, `APIProvider`, `NeighbourhoodExploreMap` |

Passive effects on map mount: ~39.6 ms (commit 6) — expected Google Maps init.

### Category tap — Public Transport

| Commit | Render | Caused by |
| ---: | ---: | --- |
| 1 | 30.3 ms | `NeighbourhoodExploreProvider` |

Main map search did not re-render. Explore marker branch updated as expected.

## Recommendation

**No code optimization required** at this baseline. Render isolation meets the contract
documented in `neighbourhood-explore-perf-baseline.md`.

Revisit optimizations (context split, marker memo) only if:

- Truncated datasets show commits **> 100 ms**, or
- `MapView` re-renders during explore interactions, or
- Users report visible jank.

## Ship checklist

- [x] React Profiler — open modal + category tap
- [x] Main map isolation verified
- [x] Unit tests green (19 tests)
- [x] Baseline doc frozen (`neighbourhood-explore-perf-baseline.md`)
- [ ] Optional: radius-change profile + Network tab on `/neighbourhood`
- [ ] Optional: Playwright explore smoke in `e2e/`
