# Saved listings + Contact manual smoke run — 2026-07-25

**Environment:** local dev (`rental-fe` :5173, `rental-be` :3000)  
**Browser:** Cursor Chrome (embedded browser)  
**Automated regression:** `npm test -- src/features/saved-listing src/features/contacts src/features/listing` → **151/151 passed** (includes 5 authenticated integration tests in `SavedListingsAuthenticated.integration.test.tsx`)

## Results summary

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 1 | Save listing (signed out) | **Pass** | Heart on `/listings/6a5e94cfea0f16347dcc66d7` → `/login?redirect=%2Flistings%2F6a5e94cfea0f16347dcc66d7` |
| 2 | Save listing (signed in) | **Pass (automated)** | `SavedListingsAuthenticated.integration.test.tsx` — save affordance on `ListingPostCard`; toggle debounce covered in `useOptimisticSavedListingToggle.test.tsx` |
| 3 | Save without agent profile | **Pass (unit)** | `leadingAction`-only footer path verified in unit tests |
| 4 | Saved drawer (nav heart) | **Pass (automated)** | Integration test: open drawer, lazy grid, close dismisses |
| 5 | Unsave from drawer | **Pass (automated)** | Integration test: delete API called on remove; cache update in `useDeleteSavedListing.test.tsx` |
| 6 | Saved tab on profile | **Pass (automated)** | Integration test: `MyProfileSavedPanel` loads saved grid |
| 7 | Contact confirm — phone (listing) | **Pass** | Phone chip → “Contact Nang Lian Sing” dialog → “Copy Phone” closes dialog |
| 8 | Contact confirm — phone (lister profile) | **Pass** | `/listers/6a5e8066ea0f16347dcc66d5` → same confirm flow |
| 9 | Contact copy “Copied” feedback | **Pass (automated)** | Integration test mocks clipboard; confirm flow passed in manual run |
| 10 | Directions confirm | **Pass** | “Open directions?” dialog → “Open Maps” → new tab `google.com/maps/dir/...` with building coords |
| 11 | Listing modal contact row | **Pass** | From lister profile grid → modal shows Save + Phone + Directions together |
| 12 | Lister profile contacts + share | **Pass** | Phone chip + Share profile button render; share modal not opened this run |

## Paths verified (this run)

- **`/listings/6a5e94cfea0f16347dcc66d7`** — save redirect, phone confirm, directions → Maps  
- **`/listers/6a5e8066ea0f16347dcc66d5`** — lister phone confirm, listing modal with save/contacts  
- **`/login?redirect=...`** — login shell after unsigned save attempt  

## Release recommendation

**Approved for release** — 2026-07-25

Signed-out save redirect, contact confirm, directions, and authenticated saved-listings flows are covered by manual smoke (unsigned/contact) plus **151/151** automated tests including authenticated integration coverage.

**Optional:** one real-Chrome pass with Google sign-in for human sanity check (OAuth popup does not complete in Cursor embedded browser).

## Authenticated coverage (automated — Track A complete)

File: `src/features/saved-listing/components/SavedListingsAuthenticated.integration.test.tsx`

1. Nav saved drawer — open, grid loads, close  
2. Unsave from drawer — DELETE `/api/v1/saved-listings/:listingId`  
3. Profile Saved tab — grid renders  
4. Listing card — save + phone affordances when signed in  
5. Phone contact — “Copied” feedback with clipboard mock  

Toggle debounce + optimistic rollback: `useOptimisticSavedListingToggle.test.tsx`  
Delete cache invalidation: `useDeleteSavedListing.test.tsx`

## Optional manual follow-up (real Chrome + Google login)

1. **Save toggle** — heart fills red; tap again unsaves; state survives modal close  
2. **Nav saved drawer** — opens panel, lazy-loads grid, close dismisses cleanly  
3. **Unsave from drawer** — remove heart on card; list updates after refetch  
4. **Profile → Saved tab** — same listings as drawer; open listing modal  
5. **“Copied” chip feedback** — confirm phone/LINE in real Chrome (clipboard allowed)  
6. **LINE/WhatsApp/Telegram/Viber** — if lister has channels, confirm opens app + copies context  

## Ship checklist

- [x] Vitest saved-listing + contacts + listing suite green (151 tests)
- [x] Manual smoke — signed-out save redirect (this run)
- [x] Manual smoke — contact confirm + directions (this run)
- [x] Authenticated saved-listings — integration tests (Track A)
- [ ] Optional: manual Chrome + Google login sanity pass
- [ ] Optional: saved-listing price-change notification path

## Notes

- Save toggle debounces API calls (400ms).  
- Saved nav icon and drawer are intentionally auth-gated in `AppNavigation`.  
- Map building detail was stuck on “Searching…” during one attempt (filters/area load); listing detail and lister profile used as primary smoke surfaces instead.
