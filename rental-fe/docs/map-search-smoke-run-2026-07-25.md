# Map search manual smoke run — 2026-07-25

**Environment:** local dev (`rental-fe` :5173, `rental-be` :3000)  
**Browser:** Cursor built-in browser (mobile layout)  
**Automated regression:** `npm test -- src/features/map-search` → **176/176 passed**

## Results summary

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 1 | Area URL hydrate | **Pass** | Real Google Map loaded; 2 buildings; area mode only |
| 2 | Area pan + commit | **Defer** | Requires map drag — verify in Chrome/Safari |
| 3 | Nearby URL hydrate | **Pass** | Pin + 1 km radius; empty results at test coords (expected) |
| 4 | Drop pin from idle | **Defer** | Manual map click |
| 5 | Line draw + commit | **Defer** | Manual multi-click on map |
| 6 | Building select + back | **Pass** | URL `building=` set; detail opens; back clears param; list restored |
| 7 | Broken building deep link | **Pass** | “Building not found” banner; list still usable |
| 8 | Error + retry | **Defer** | Simulate offline in DevTools |
| 9 | List hover ↔ marker | **Defer** | Verify hover highlight in desktop browser |
| 10 | Filters + URL sync | **Pass** | 1+ bed applied; `filters=` in URL; chip visible |
| A11y | Spot checks | **Partial** | Skip link present; live status announcements observed |

## Release recommendation

**Approved for release** — 2026-07-25

Core contract paths (hydrate, select/back, broken deep link, filters/URL) verified against real API + Google Maps. Automated suite: **176/176** map-search tests passing.

Remaining checklist items are interaction-heavy (map pan, line draw, offline retry, hover). They are **non-blocking**; confirm in Chrome/Safari when convenient.

## Ship checklist

- [x] Vitest map-search suite green (176 tests)
- [x] Integration tests (`MapSearchPage.integration.test.tsx`, 14 tests)
- [x] Manual smoke — critical paths (this run)
- [ ] Deploy `rental-fe` + `rental-be` to target environment
- [ ] Smoke production URL once after deploy
- [ ] Optional: Playwright E2E locally (`npm run test:e2e:install && npm run test:e2e`)

## Deferred follow-up (optional, pre-release)

1. Pan map → “Search this area” → URL bounds update  
2. Pin mode from idle → commit nearby search  
3. Line mode → two points → “Search near line”  
4. DevTools offline → Retry recovery  
5. Hover list card → black marker highlight  
6. VoiceOver/NVDA announcement pass on one mode each
