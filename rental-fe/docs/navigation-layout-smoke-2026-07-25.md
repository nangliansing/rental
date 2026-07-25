# Navigation layout smoke — 2026-07-25

**Scope:** Shared standalone header + lister profile route move

## Route layout

| Layout | Routes |
|--------|--------|
| `RootLayout` + bottom nav | `/`, `/profile`, `/admin` |
| `StandalonePageLayout` + header | login, register, profile edit, listings, buildings edit, lister profile |

## Browser smoke (localhost:5173)

| # | Scenario | Result | Notes |
|---|----------|--------|-------|
| 1 | Home `/` | **Pass** | Bottom nav present; no standalone header |
| 2 | Lister profile | **Pass** | Header: back, home, profile; no bottom nav; no Recommend tab |
| 3 | Back from lister (direct entry) | **Pass** | Falls back to `/` |
| 4 | Login `/login` | **Pass** | Shared header; no bottom nav |
| 5 | Listing detail | **Pass** | Shared header on `/listings/:id` |
| 6 | Create listing `/listings/new` | **Defer** | Redirects to home when unauthenticated (expected) |

## Automated regression

- `src/shared/components/navigation` — 8 tests
- `src/features/agent` — 17 tests
- `useNavigateBack` — 2 tests

## Follow-ups

- ~~Create listing step-back override~~: fixed `StandalonePageBackContext` function-state bug + covered by signed-in integration smoke
- Share modal + review write: optional manual passes from lister audit

## Signed-in smoke (2026-07-25)

Google OAuth cannot complete in the Cursor embedded browser, so signed-in flows are covered by mocked integration tests.

| # | Scenario | Result | Notes |
|---|----------|--------|-------|
| 1 | Profile dashboard + tabs + saved nav | **Pass** | `signed-in-navigation.smoke.integration.test.tsx` |
| 2 | Profile edit + standalone header | **Pass** | Back / home / profile controls |
| 3 | Create listing step 2 → step 1 via header back | **Pass** | Also fixed back-handler registration bug |
| 4 | Saved listings drawer open/close | **Pass** | Mobile nav affordance |
| 5 | Playwright signed-in e2e | **Pass** | 5/5 with mocked session (`e2e/signed-in.smoke.spec.ts`)
| 6 | Real Google sign-in in browser | **Defer** | Manual pass in Chrome |

### Bug fixed during smoke

`StandalonePageBackProvider` stored handlers with `setState(handler)`, which React treats as an updater function and invoked on mount — causing create listing to navigate away immediately. Fixed by wrapping with `setState(() => handler)`.

### Automated regression (signed-in)

- `src/app/signed-in-navigation.smoke.integration.test.tsx` — 4 tests
- `src/features/saved-listing/components/SavedListingsAuthenticated.integration.test.tsx` — 5 tests
- `src/shared/components/navigation/StandalonePageBackContext.test.tsx` — back handler registration
