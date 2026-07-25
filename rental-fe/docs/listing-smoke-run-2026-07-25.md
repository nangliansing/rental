# Listing manual smoke run — 2026-07-25

**Environment:** local dev (`rental-fe` :5173, `rental-be` :3000)  
**Browser:** Cursor built-in browser  
**Automated regression:** `npm test -- src/features/listing` → **105/105 passed**

## Results summary

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 1 | Listing modal from map-search | **Pass** | Area URL + `building=` → open ฿5k listing → modal shows agent, pricing, building summary, “More rooms in this building” |
| 2 | Modal back to building | **Pass** | “Back to building” closes modal; building detail with “2 available listings” restored |
| 3 | Standalone listing detail page | **Pass** | `/listings/6a5e94cfea0f16347dcc66d7` loads post, building card, contact actions |
| 4 | Create — valid `lat`/`lng` | **Pass** | Coords shown; building step → listing step (Step 2 of 2) with summary + coordinates |
| 5 | Create — invalid `lat`/`lng` | **Pass** | Amber warning shown; “Continue to listing” **disabled** (`submitDisabled`) |
| 6 | Edit listing (unauthenticated) | **Pass** | `/listings/:id/edit` shows login gate (“Log in to edit your listing”) |
| 7 | Delete listing + rollback | **Defer** | Requires Google sign-in as listing owner (no session in Cursor browser) |
| 8 | More rooms — loaded state | **Pass** | Pet Condo listing shows “More rooms in this building” grid after load |
| 9 | More rooms — loading skeleton | **Partial** | Skeleton implemented (`aria-busy`, pulse placeholders); not captured live due to React Query cache on repeat visits. Confirm in Chrome: hard reload + Slow 3G. |

## Release recommendation

**Approved for release** — 2026-07-25

Core listing paths verified after refactor: map-search modal, detail page, create location guards, edit login gate, and more-rooms section. Automated suite: **105/105** listing tests passing.

**Non-blocking follow-up:** owner delete + failed-delete rollback in Chrome/Safari while signed in as listing owner.

## Ship checklist

- [x] Vitest listing suite green (105 tests)
- [x] Manual smoke — critical paths (this run)
- [ ] Owner delete smoke (signed-in agent)
- [ ] Failed delete rollback smoke (DevTools → block DELETE → card reappears)
- [ ] More rooms skeleton visual check (Slow 3G + hard reload)

## Deferred follow-up (optional)

1. Sign in via Google on `/profile` → open owned listing → delete → confirm card hides  
2. DevTools → Network → block `DELETE /api/v1/listings/owner/...` → confirm card reappears and error shown  
3. Slow 3G → fresh listing detail URL (uncached building) → confirm pulse skeleton before grid
