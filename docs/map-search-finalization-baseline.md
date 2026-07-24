# Map-search finalization baseline

This document freezes the expected behavior and records the pre-refactor
architecture. Optimization work must preserve this contract unless a product
change is explicitly approved.

## Behavioral contract

### Mode ownership

| Mode | Visible geographic data | Search action | Enabled building query |
| --- | --- | --- | --- |
| Area | Selected place marker only | Search current bounds | Area |
| Pin | Selected/current-location pin and radius only | Search near pin | Nearby |
| Line | Numbered points, polyline, and coverage only | Search near line | Near-lines |

- Exactly one interaction mode is active.
- Switching modes clears the active result source, selected building, hover,
  place marker, stale state, and search URL parameters.
- Switching modes does not delete the line draft. It remains hidden outside
  line mode and can be edited after returning.
- No cached building markers are shown while the active result source is null.
- A mode does not submit automatically. Search is always explicit.

### Line workflow

- Zero points: `Place starting point` is visible and disabled.
- One point: `Place another point` is visible and disabled.
- Two or more points: the near-lines action is enabled.
- Editing submitted geometry, distance, or filters marks results stale.
- Stale line results use `Search updated line`.
- Undo removes one draft point. The line mode button only toggles modes.
- The URL contains only submitted geometry, not an unfinished edit.
- At most 24 line points are accepted by the UI.

### Request lifecycle

- Only the query matching `searchSource` may be enabled.
- A changed query key aborts its superseded transport.
- Leaving a mode disables its query by clearing `searchSource`.
- Area and line results paginate; nearby results are a bounded single page.
- Previous results may remain during an in-mode refresh, but never cross mode
  boundaries.

## Current architecture baseline

At this baseline the feature has 61 production files and 24 test files.

| Unit | Lines | Responsibility today |
| --- | ---: | --- |
| `MapSearchPage.tsx` | 724 | URL hydration, all three searches, mode transitions, results, filters, listing intent, and session assembly |
| `MapView.tsx` | 417 | Google Maps lifecycle, camera, all overlays, map events, and map UI composition |
| `SearchAreaButton.tsx` | 366 | Primary action, three mode controls, geolocation, distance popover, and line editing controls |
| `MapSearchSessionContext.tsx` | 84 | One 40+ field state/action contract shared by map, controls, search, and results |

Ten production modules reference the session context. Its provider value is an
object literal created by `MapSearchPageContent`, so every page render changes
the context identity and schedules every session consumer, even when a consumer
uses an unrelated field. This is the primary render-isolation concern.

The filter context is already memoized and its actions use stable callbacks.
`BuildingMarkerLayer` and individual building markers are already memoized and
keep mutable Google Maps SDK objects in refs.

## Calculation and operation baseline

### Already bounded or memoized

- Area and line infinite pages are flattened and deduplicated with `useMemo`.
- Nearby buildings are deduplicated with `useMemo`.
- Submitted line coordinates are converted back to map points with `useMemo`.
- Search transports use TanStack Query cancellation signals.
- Building list virtualization already has dedicated render tests.

### Confirmed avoidable work

1. `buildLineCoveragePolygon` executes on every `MapView` render, including
   area and pin modes and unrelated hover/result changes.
2. `MapSearchPage` instantiates all three search hooks on every render, although
   only one query is enabled.
3. The broad session context propagates every state change to all ten session
   consumers.
4. Most session action functions are recreated on each page render.
5. Initial URL state is parsed once in `MapSearchPage` and again in
   `MapSearchPageContent`.
6. Line draft equality uses `JSON.stringify` during committed filter changes.
7. The URL-selected building lookup is a linear search on every page render.
8. Line mode renders one coverage circle and one point marker per point, plus a
   polygon and polyline. This is bounded by 24 points but should be measured
   before changing visual fidelity.

### Correctness gap recorded for later work

`getMapSearchAnnouncement` treats every non-nearby search as an area search, so
line results receive incorrect screen-reader wording. This should be corrected
when the presentation selectors are consolidated.

## Characterization coverage at this baseline

- Reducer tests cover area, pin, current-location, and line transitions.
- `MapView.mode-contract.test.tsx` enforces mutually exclusive area, pin, and
  line overlays, even when deliberately given inconsistent stored data.
- Search-control tests cover all primary-action states and mode controls.
- Query tests cover enabled guards, pagination, and cancellation.
- URL tests cover area/nearby safety and line round-tripping.
- Coverage geometry, filters, results, typeahead, camera, geolocation, and
  virtualization have focused tests.

## Step 2 boundary

The next step should optimize state and render isolation only:

1. Extract a small, testable map-search state machine for mode, draft,
   submitted search, and selection transitions.
2. Split the broad session contract into stable state slices and action slices,
   or use selector-based external state if it results in less code.
3. Preserve the API hooks, visual components, URL format, and behavior contract.
4. Add render-count assertions before and after the split.

### Step 2 progress (2026-07-25)

- `buildLineCoveragePolygon` is already memoized in `LineSearchOverlays` via
  `useMemo` — baseline item #1 in "Confirmed avoidable work" is addressed.
- `getMapSearchAnnouncement` already uses per-source scope phrases including
  line mode — the recorded correctness gap appears resolved; keep covered by
  `map-search-announcement.test.ts`.
- **Next actionable item:** split `MapSearchSessionContext` to reduce render
  fan-out (baseline primary concern).

Geometry optimization, component file reorganization, and query-hook
consolidation should wait until render isolation is measured after Step 2.

## Step 2 result: render isolation

Step 2 keeps `MapInteractionProvider` and its tested reducer as the single
owner of interaction-mode transitions instead of introducing a second state
machine. The former all-purpose session subscription is now split at the
render boundary into three focused, memoized contracts:

| Slice | Consumers | Changes that can schedule those consumers |
| --- | --- | --- |
| Canvas | `MapView` | Map data, overlays, selection, camera, and map callbacks |
| Controls | `SearchAreaButton` | Search readiness, mode controls, distances, and line draft |
| Place | `PlaceSearch`, `ListerSuggestionList` | Place selection/open state and agent identity |

Result and detail components temporarily retain the complete session contract;
they share result lifecycle data and will be separated when their component
boundary is finalized. Actions passed through the new slices use stable event
callbacks, so state changes do not invalidate consumers solely because a
handler was recreated. The three heavy boundary components are memoized.

A render-count contract proves that updating the controls slice does not render
the canvas slice. Mode-overlay characterization tests continue to prove that
area, pin, and line geographic data remain mutually exclusive.

## Step 3 boundary

The next step should remove avoidable derived work without changing ownership
or UI behavior:

1. Compute line coverage only when line mode can display it, and memoize it by
   line points and distance.
2. Parse initial URL state once and pass the parsed value to its consumers.
3. Replace repeated line serialization and selected-building scans with small,
   memoized selectors.
4. Measure the affected calculations with focused tests before reorganizing
   component files or query orchestration.

## Step 3 result: derived-work isolation

Derived calculations now follow the smallest relevant dependency boundary:

- Line coverage is memoized by interaction mode, line-point identity, and
  distance. Area and pin modes never call the coverage builder.
- The initial map-search URL is parsed once by `MapSearchPage`; the same parsed
  state initializes both the interaction provider and page content. Browser
  history restoration still parses each genuinely restored URL once.
- Ordered line drafts use a direct coordinate comparison with an identity and
  length fast path instead of serializing both point arrays.
- URL-selected building resolution is memoized by result collection and
  pending ID, so unrelated page state no longer repeats the linear lookup.
- Active building collections are selected in a memoized source selector,
  preserving their identity for the canvas context.

Focused tests enforce mode-gated coverage calculation and coordinate equality.
The URL format, geographic output, and mode behavior are unchanged.

## Step 4 boundary

The next step should organize search request and result ownership:

1. Define one query-input model derived from the submitted search source.
2. Keep query activation mutually exclusive and avoid preparing request data
   for inactive modes.
3. Consolidate shared result selection, pagination, loading, and error mapping
   without hiding mode-specific API behavior.
4. Preserve query keys, cancellation, pagination, and cached-refresh behavior.

Component file reorganization should follow this ownership change so files are
split along proven runtime boundaries rather than by size alone.

## Step 4 result: request and result ownership

`useMapBuildingSearch` now owns the complete building-query read model:

- A discriminated submitted-search value permits exactly one request shape:
  area bounds, nearby position/radius, line geometry/distance, or no search.
- Only the submitted source receives filters and geographic request data.
  Inactive hooks remain mounted to preserve React hook order, but receive null
  geometry, a shared empty filter object, and `enabled: false`.
- The existing area, nearby, and near-lines hooks remain unchanged, preserving
  their query keys, cancellation signals, placeholder data, and pagination.
- Page flattening, deduplication, active-result selection, loading/empty/error
  status, refresh state, and pagination routing now have one owner.
- Nearby remains bounded to one page; only area and line can fetch another
  page.

The page no longer imports or interprets individual query hook results. The
orchestration contract is tested independently, while the transport activation
contract still verifies that only the active API executes.

## Step 5 boundary

The next step should reorganize components around established runtime owners:

1. Extract page session assembly from transition/event orchestration.
2. Split map overlays from Google Maps lifecycle and camera behavior.
3. Split the primary action from mode-control buttons where this reduces
   dependencies and rerenders.
4. Keep provider depth, public hooks, DOM structure, and visual behavior stable
   unless a smaller boundary has a measured benefit.

This should be a movement-only refactor with characterization tests; no search
logic or UI behavior should change in the same step.

## Step 5 result: runtime component boundaries

The component structure now follows the measured runtime owners without
changing DOM order or interaction behavior:

- `MapCameraRestorer` owns camera restoration and selected-building focus. It
  is memoized independently from marker hover and result presentation.
- `LineSearchOverlays` owns coverage geometry and all line drawing primitives.
  Stable point/distance props prevent unrelated map renders from rebuilding or
  reconciling these overlays.
- Area-place and pin-radius overlays are small memoized components beside the
  line overlays. The draggable pin remains in `MapView`, where its SDK element
  ref and keyboard listener are owned.
- `MapSearchProviders` owns the provider order, leaving page orchestration to
  assemble values without repeating provider plumbing.
- `MapView` decreased from 417 to 296 lines while preserving the exact overlay
  order enforced by the mode contract.

The search controls were intentionally not split in this step. Both candidate
children would still subscribe to the same controls context, so moving markup
alone would add files without isolating updates.

## Step 6 boundary

The next step should consolidate page transitions and command ownership:

1. Inventory repeated cleanup performed by area, pin, and line transitions.
2. Extract shared commands only where their invariants are identical.
3. Stabilize the remaining full-session actions used by result components.
4. Preserve URL history semantics, filter scopes, drafts, submitted searches,
   and selection cleanup with transition-focused tests.

This step should reduce `MapSearchPage` orchestration duplication before any
further presentation split.

## Step 6 result: commands, stable actions, and defensive boundaries

Valid area, nearby, and line submissions now share one commit command for the
identical invariants: clear selection, commit filters, set the submitted
source, clear stale state, and write the URL. Mode-specific handlers retain
ownership of their submitted geometry.

The complete result-session value is memoized, and every action it exposes is
a stable event callback. Unrelated parent renders therefore no longer change
the session solely because handlers or the provider object were recreated.

Runtime boundaries now fail closed on malformed input:

- Shared validators enforce finite, ranged coordinates, ordered bounds, valid
  line geometry, and supported radius values.
- Map events, reducer actions, URL hydration, query preparation, overlays,
  camera targets, building markers, and listing navigation reuse those rules.
- Invalid points are omitted from overlays; invalid coverage distances do not
  execute geometry calculation.
- Building locations with missing or invalid GeoJSON data do not render or
  move the camera.
- Pagination ignores calls when no next page exists or one is already loading.
- The 24-point line limit and allowed radii each have one shared source of
  truth.

Focused malformed-input tests cover reducers, geometry selectors, overlays,
query activation, and pagination. Valid behavior is unchanged.

## Step 7 boundary

The next step should finalize presentation correctness and accessibility:

1. Consolidate search-source presentation selectors and correct the recorded
   line-result announcement wording.
2. Audit loading, empty, error, stale, and result-count announcements for all
   three modes.
3. Verify focus restoration and keyboard operation across mobile and desktop
   results.
4. Run a final dependency/render audit and remove only proven dead or duplicate
   code.

No new search behavior or visual redesign should be introduced during this
finalization step.

## Step 7 result: presentation and accessibility

Presentation selectors and announcements were consolidated. Line-mode screen
reader wording was corrected. Focus restoration was extracted to
`useResultsPanelFocus` with desktop/mobile panel scoping. Result components
migrated to `MapSearchResultsContext` instead of the full session hook.

## Step 8 result: URL ownership

`useMapSearchUrl` owns URL hydration, submitted search state, POP restore,
listing purpose, and `updateSearchUrl`. Shared URL helpers live in
`map-search-url.ts`. `MapSearchPage` no longer embeds URL effects directly.

## Step 9 result: command ownership

`useMapSearchCommands` owns all search, mode, selection, and listing commands
via stable `useEventCallback` wrappers. Shared `commitBuildingSearch` and
`clearActiveSearchForModeChange` consolidate repeated invariants.

## Step 10 result: session assembly

`useMapSearchSessionAssembly` builds the four memoized provider slices:
canvas, controls, place, and results. `MapSearchPage` is orchestration-only.

## Step 11 result: cleanup and camera polish

- The unused legacy `MapSearchSessionContext` provider and full-session
  `useMemo` were removed. All production consumers already use sliced hooks.
- Building selection camera now prefers `fitBounds` over `flyTo` when search
  context exists (nearby pin or committed area bounds), keeping both the
  search anchor and selected building in frame.
- Building markers selected or hovered from the results list render outside
  the clusterer with a black active state so markers do not disappear.
- `getBuildingSelectionCameraBounds` in `map-camera.ts` owns the selection
  framing calculation with focused tests.

## Remaining optional work

1. Split `SearchAreaButton` only if profiling shows a rerender benefit.
2. Line-mode building selection camera could later include submitted line
   geometry in the fit bounds calculation.

## Testing pipeline result

Steps 1–9 are covered by `MapSearchPage.integration.test.tsx` (Vitest +
Testing Library). Step 10 adds:

- Manual smoke checklist: `docs/map-search-manual-smoke-checklist.md`
- Playwright browser smoke: `e2e/map-search.smoke.spec.ts` (`npm run test:e2e`)

E2E smoke uses mocked building-search APIs and a real Google Maps SDK. Tests skip
when `VITE_GOOGLE_MAPS_API_KEY` is not configured.

## Step 12 result: best-practice optimization pass

- Marker hover moved to `MapSearchMarkerHighlightContext` so list hover no longer
  invalidates the canvas context or re-renders `MapView`.
- `useMapSearchPageState` extracted; `MapSearchPage` is now a layout shell.
- Defensive URL parsing uses shared position/bounds validators; map bounds and
  line points reject invalid geometry at the boundary.
- Broken `building` deep links surface explicit UI via
  `isPendingBuildingUnresolved`.
- Initial search errors and stale state both expose Retry actions.
- Line "search again" re-commits submitted geometry instead of draft points.
- Filter draft syncs when external filter state changes (URL restore).
- Shared `CollectionRefreshErrorBanner`, `BuildingMarkerButton`, memoized
  `BuildingCard`, and memoized filter chips reduce duplication and rerenders.
- `MapInteractionProvider` actions are stable across pin moves.
