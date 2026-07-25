# Profile + Auth manual smoke run — 2026-07-25

**Environment:** local dev (`rental-fe` :5173, `rental-be` :3000)  
**Browser:** Cursor built-in browser (signed-out) + Playwright mocked session (signed-in)  
**Automated regression:** `npm test -- src/features/profile src/features/auth` → **34/34 passed**  
**E2E regression:** `e2e/profile-dashboard.smoke.spec.ts` (8) + `e2e/lister-onboarding.smoke.spec.ts` (3) + `e2e/signed-in.smoke.spec.ts` (5) → **16/16 passed** (Playwright, mocked session)

## Results summary

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 1 | Profile page (signed out) | **Pass** | Inline `GoogleLoginPanel`; heading “Continue to your profile”; Google button renders |
| 2 | Profile edit (signed out) | **Pass** | `LoginRequired` gate: “Log in to edit your contact profile” + Log in / Back to profile |
| 3 | Login page | **Pass** | `/login?redirect=/profile/edit` shows “Continue to Rental” + Google sign-in |
| 4 | Profile setup (create) | **Pass** | Covered by `e2e/lister-onboarding.smoke.spec.ts` (mocked Google session) |
| 5 | Edit profile | **Pass** | E2E: save returns to `/profile` with updated display name |
| 6 | Tabs — listings / pending / saved / reviews | **Pass** | E2E: listings modal, pending detail + delete cancel, saved grid, reviews empty state |
| 7 | Share modal copy | **Pass** | E2E: Copy link → “Copied link” |
| 8 | Logout | **Pass** | E2E: Settings → Log out → signed-out profile gate |

## Additional authenticated checks (E2E)

| Scenario | Status | Notes |
|----------|--------|-------|
| Tab isolation | **Pass** | Header name + stats remain stable when switching tabs |
| Contact chips | **Pass** | Phone chip → “Copied” |
| Login redirect | **Pass** | `/login?redirect=/profile` → `/profile` while signed in |
| Signed-in nav affordances | **Pass** | `e2e/signed-in.smoke.spec.ts` (tabs, saved drawer, edit shell) |

## Unauthenticated paths verified (this run)

- **`/profile`** — auth gate with Google panel (not redirect to `/login`; intentional UX difference vs edit page)
- **`/profile/edit`** — `LoginRequired` with `loginHref=/login?redirect=/profile/edit`
- **`/login?redirect=/profile/edit`** — login shell loads; Google Identity widget present
- **`GET /api/v1/users/me`** — returns unauthenticated (expected)

## Release recommendation

**Approved for release** — 2026-07-25

Signed-out gates, login routing, and authenticated profile dashboard flows are covered by Vitest + Playwright smoke tests. Optional non-blocking follow-up: one real Chrome pass with Google OAuth before a major release.

## Authenticated follow-up checklist (Chrome/Safari)

Sign in with Google first, then verify:

1. **Profile setup** — new user without agent profile sees “Contact profile” form; submit creates profile  
2. **Edit profile** — `/profile/edit` loads form with saved values; save returns to `/profile`  
3. **Tabs**
   - **Listings** — grid loads; open listing modal  
   - **Pending** — submissions grid; open detail overlay; delete cancel works  
   - **Saved** — saved listings panel loads (or empty state)  
   - **Reviews** — lister reviews section loads  
4. **Tab isolation** — switching tabs does not flash/reload header stats (overview stays stable)  
5. **Share modal** — Share button → Copy link shows “Copied link” for ~1.5s  
6. **Contact chips** — copy phone/LINE chip shows “Copied”  
7. **Logout** — Settings → Log out → returns to signed-out profile gate  
8. **Login redirect** — while signed in, visit `/login?redirect=/profile` → redirects to `/profile`

**E2E status:** items 1–8 covered with mocked session (items 1–4 via lister onboarding + profile dashboard specs). Real Chrome pass remains optional for OAuth confidence.

## Ship checklist

- [x] Vitest profile + auth suite green (34 tests)
- [x] Manual smoke — signed-out gates (this run)
- [x] Authenticated dashboard smoke — Playwright mocked session (`profile-dashboard.smoke.spec.ts`)
- [ ] Optional: logout + re-login round trip in real Chrome with Google OAuth

## Notes

- V1 auth is **Google-only**; password login exists in API but is not exposed in UI.  
- Cursor browser cannot complete Google OAuth automatically — use Chrome for a final human sign-off if desired.  
- Playwright uses mocked `/users/token/refresh` + bearer token; behavior matches signed-in dashboard without live Google credentials.
