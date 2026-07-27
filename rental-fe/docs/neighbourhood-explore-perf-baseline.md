# Neighbourhood explore — performance baseline

This document freezes the expected render-isolation contract for the
neighbourhood explore modal. Optimization work must preserve this contract unless
a product change is explicitly approved.

Feature root: `src/features/buildings/neighbourhood-explore/`

## Behavioral contract (performance-relevant)

| Interaction | Expected update owner | Main map search (`MapView`) | API call |
| --- | --- | --- | --- |
| Open modal | `NeighbourhoodExploreDialogProvider` | Must not re-render | Yes — first fetch |
| Category pill | `NeighbourhoodExploreProvider` | Must not re-render | No — client filter |
| Radius change | `NeighbourhoodExploreProvider` | Must not re-render | Yes — new query key |
| Pin select | `NeighbourhoodExploreProvider` | Must not re-render | No |
| Close modal | Unmount explore tree | Must not re-render | — |

- Explore uses a **separate** Google Map instance
  (`NEIGHBOURHOOD_EXPLORE_MAP_INSTANCE_ID = "neighbourhood-explore"`).
- Overlays render **inside** `<Map>` so vis.gl markers bind to the correct instance.
- Category filtering uses `visiblePlaces` (client-side). Hidden pins unmount — expected.
- No marker clustering. Cost scales O(N) with visible place count.
- Modal close fully unmounts the map (`reuseMaps={false}`). Reopen pays cold map init.

## Render-isolation budgets (local dev, mobile emulation)

Measured with React DevTools Profiler on 2026-07-28. Treat as regression guardrails,
not production SLAs.

| Scenario | Commits | Render (typical) | Cause | Pass criteria |
| --- | ---: | ---: | --- | --- |
| Open Explore | 7 | 30–52 ms peak | `NeighbourhoodExploreDialogProvider`, then `Map` / `NeighbourhoodExploreMap` | `MapView` gray / no client render |
| Category tap | 1–2 | ~30 ms | `NeighbourhoodExploreProvider` | `MapView` gray / no client render |

**Recorded 2026-07-28:** both scenarios passed. Main map did not re-render.

## Architecture notes

| Unit | Responsibility |
| --- | --- |
| `NeighbourhoodExploreDialogProvider` | Open/close + modal mount gate |
| `NeighbourhoodExploreProvider` | Query state, category/radius, selection, context value |
| `NeighbourhoodExploreMap` | Google Map, origin pin, circle, place markers |
| `useBuildingNeighbourhood` | `GET /buildings/:id/neighbourhood` via React Query |

### Known acceptable work

1. Map mount passive effects (~40 ms) on first open — Google Maps SDK.
2. `BuildingDetailPage` may show a small parent render (~2 ms) on explore updates.
3. Category filter remounts markers not in `visiblePlaces` — correct behavior.

### Optimize only when profiling shows

1. Render commits **> 100 ms** on category/radius with truncated datasets.
2. `MapView` or building list rows re-render during explore interactions.
3. User-visible jank panning the explore map with many pins.

Do **not** split context or memo markers preemptively without a measured regression.

## Profiling procedure (repeat before optimize)

**Prerequisites**

- Local FE (`npm run dev` :5173) + BE (`npm run dev` :3000)
- React DevTools with **Profiler** + “Record why each component rendered”
- Chrome Incognito with extension allowed, or normal Chrome with extensions off
- Mobile emulation (Pixel 7)

**Open modal**

1. Map search → building detail → Profiler Record → Explore neighbourhood → Stop.
2. Confirm cause chain starts at `NeighbourhoodExploreDialogProvider`.
3. Confirm `MapView` / `BuildingMarkerLayer` did not client-render (gray in flamegraph).

**Category tap**

1. Clear profiler → Record → one category pill → Stop.
2. Confirm cause is `NeighbourhoodExploreProvider`.
3. Confirm `MapView` did not client-render.

**Automated regression**

```bash
npm test -- src/features/buildings/neighbourhood-explore \
  src/features/buildings/api/getBuildingNeighbourhood.test.ts \
  src/features/buildings/utils/filterNeighbourhoodPlaces.test.ts
npm run test:e2e -- e2e/neighbourhood-explore.smoke.spec.ts
```

Lightweight render-isolation guardrails live in
`src/features/buildings/neighbourhood-explore/__tests__/neighbourhoodExploreRenderIsolation.test.tsx`.
They assert split-context subscriptions and the dedicated explore map instance id.

## Remaining optional work

1. Profile **radius change** (API refetch + marker replace) — network-bound, separate from render isolation.
2. ~~Playwright smoke for explore open + category filter (not yet in `e2e/`)~~ — added in `e2e/neighbourhood-explore.smoke.spec.ts`.
3. Code optimizations (context split, marker memo) — only after a failed re-profile.
