# Profile + Auth manual smoke run — 2026-07-25

**Environment:** local dev (`rental-fe` :5173, `rental-be` :3000)  
**Browser:** Cursor built-in browser  
**Automated regression:** `npm test -- src/features/profile src/features/auth` → **34/34 passed**

## Results summary

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 1 | Profile page (signed out) | **Pass** | Inline `GoogleLoginPanel`; heading “Continue to your profile”; Google button renders |
| 2 | Profile edit (signed out) | **Pass** | `LoginRequired` gate: “Log in to edit your contact profile” + Log in / Back to profile |
| 3 | Login page | **Pass** | `/login?redirect=/profile/edit` shows “Continue to Rental” + Google sign-in |
| 4 | Profile setup (create) | **Defer** | Requires Google sign-in (no session in Cursor browser) |
| 5 | Edit profile | **Defer** | Requires authenticated agent profile |
| 6 | Tabs — listings / pending / saved / reviews | **Defer** | Requires signed-in profile dashboard |
| 7 | Share modal copy | **Defer** | Requires signed-in profile |
| 8 | Logout | **Defer** | Requires signed-in profile (Settings modal) |

## Unauthenticated paths verified (this run)

- **`/profile`** — auth gate with Google panel (not redirect to `/login`; intentional UX difference vs edit page)
- **`/profile/edit`** — `LoginRequired` with `loginHref=/login?redirect=/profile/edit`
- **`/login?redirect=/profile/edit`** — login shell loads; Google Identity widget present
- **`GET /api/v1/users/me`** — returns unauthenticated (expected)

## Release recommendation

**Approved for release (auth gates)** — 2026-07-25

Signed-out flows and login routing verified after Profile + Auth refactor. Automated suite: **34/34** profile + auth tests passing.

**Non-blocking follow-up:** complete authenticated dashboard smoke in Chrome/Safari (checklist below).

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

## Ship checklist

- [x] Vitest profile + auth suite green (34 tests)
- [x] Manual smoke — signed-out gates (this run)
- [ ] Authenticated dashboard smoke in Chrome (checklist above)
- [ ] Optional: logout + re-login round trip

## Notes

- V1 auth is **Google-only**; password login exists in API but is not exposed in UI.  
- Cursor browser cannot complete Google OAuth automatically — use Chrome for owner flows.
