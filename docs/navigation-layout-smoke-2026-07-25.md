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

- Create listing step-back override: covered by `useStandalonePageBack` (unit-level; needs signed-in manual pass)
- Share modal + review write: optional manual passes from lister audit
