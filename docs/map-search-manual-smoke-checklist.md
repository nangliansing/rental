# Map search manual smoke checklist

Use this checklist before release to validate the behavioral contract in a real
browser with the Google Maps SDK and network stack. Automated Vitest integration
tests cover wiring; this checklist covers what only a human (or Playwright smoke
tests) can confirm in production-like conditions.

**Prerequisites**

- `rental-fe/.env` has valid `VITE_GOOGLE_MAPS_API_KEY` and `VITE_GOOGLE_MAPS_MAP_ID`
- Playwright browser installed once: `npm run test:e2e:install`
- Backend API reachable for full manual QA (E2E smoke mocks search APIs)
- Mobile viewport (~~390px) and desktop viewport (~~1280px)

**Quick automated smoke**

One-time setup on each machine (downloads Chromium to `~/Library/Caches/ms-playwright`):

```bash
npm run test:e2e:install
```

Then:

```bash
npm run test:e2e
```

Skips automatically when `VITE_GOOGLE_MAPS_API_KEY` is missing.
If tests fail with `Executable doesn't exist`, run `npm run test:e2e:install` again.

---



## 1. Area search — URL hydrate

- [ ] Open `/?search=area&neLat=14&neLng=101&swLat=13&swLng=100`
- [ ] Map loads without “Map temporarily unavailable”
- [ ] Results panel shows building count and cards
- [ ] Only area markers appear (no pin radius or line overlays)



## 2. Area search — commit after pan

- [ ] Pan the map; “Search this area” appears
- [ ] Click commit; URL bounds update and results refresh
- [ ] Stale banner clears after successful search



## 3. Nearby (pin) — URL hydrate

- [ ] Open `/?search=nearby&lat=13.75630&lng=100.50180&radius=1000`
- [ ] Pin and radius circle visible; no line overlays
- [ ] Results scoped to pin search



## 4. Nearby — drop pin from idle map

- [ ] From idle map, enter pin mode and drop a pin
- [ ] “Search near pin” commits; URL updates with lat/lng/radius
- [ ] Moving pin marks results stale until re-search



## 5. Line search — draw and commit

- [ ] Enter line mode; place two or more points
- [ ] Coverage and numbered markers render
- [ ] “Search near line” commits; URL contains `search=line` and `line=`
- [ ] Editing line or distance marks results stale



## 6. Building select and back

- [ ] Select a building from the list
- [ ] Detail view opens; URL contains `building=<id>`
- [ ] Browser back returns to list without leaving detail stuck open
- [ ] Selected/hovered marker stays visible on the map (not hidden in cluster)



## 7. Broken building deep link

- [ ] Open area URL with `&building=missing-building-id`
- [ ] “Building not found” (or equivalent) message appears
- [ ] Results list still usable



## 8. Error and retry

- [ ] Simulate failed search (offline or invalid API)
- [ ] Error state shows with Retry
- [ ] Retry refetches and recovers when network returns



## 9. List hover ↔ map marker

- [ ] Hover a list card; matching map marker highlights (black active state)
- [ ] Mouse leave clears highlight



## 10. Filters and URL sync

- [ ] Open Filters; change bedroom or rent
- [ ] Apply filters; chip appears and URL `filters=` param updates
- [ ] Reload page; filters and results match URL
- [ ] Remove a chip; URL and results update

---



## Accessibility spot checks

- [ ] Screen reader announces loading → success/empty for each mode
- [ ] Tab reaches skip link, place search, primary search action, filters, list
- [ ] Filter config “Apply filters” returns focus to results panel
- [ ] Building detail back button restores sensible focus



## Regression guard

After manual smoke, confirm unit/integration suite still passes:

```bash
npm test -- src/features/map-search
```

Expected: all map-search tests green (including `MapSearchPage.integration.test.tsx`).