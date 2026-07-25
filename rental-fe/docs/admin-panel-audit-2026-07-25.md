# Admin panel audit — 2026-07-25

**Route:** `/admin`  
**Layout:** `RootLayout` (bottom nav) + desktop-only workspace (`lg+`)  
**Automated regression:** `npm test -- src/features/admin` → **88/88 passed**  
**E2E regression:** `e2e/admin-panel.smoke.spec.ts` → **3/3 passed** (Playwright, mocked session, 1280×900 viewport)

## Audit summary

| Area | Before | After |
|------|--------|-------|
| Test coverage | API/mutation hooks only (82 tests) | + page auth gates, workspace shell, tab switch (88 tests) |
| E2E smoke | None | Signed-out gate, USER forbidden, ADMIN review center |
| Documentation | None | This audit + manual checklist |
| UI surface | Single 4,300-line page, untested | Auth gates and tab shell covered by tests |

## Architecture

| Layer | Detail |
|-------|--------|
| **Route** | `/admin` — lazy-loaded `AdminPanelPage` in `router.tsx` |
| **Auth gate** | In-page: loading → `LoginRequired` → `AdminForbidden` → workspace |
| **Roles** | `OWNER` and `ADMIN` allowed; `USER` sees forbidden screen |
| **Viewport** | Desktop workspace (`hidden lg:block`); mobile shows “Use a larger screen” |
| **Navigation** | No admin link in bottom nav — direct URL `/admin` only |

## Workspace tabs (6)

| Tab | Purpose | Key actions |
|-----|---------|-------------|
| **Pending listings** | Review new submissions | Approve / reject with reason; suspend lister |
| **Building edits** | Review building change requests | Approve / reject with diff view |
| **Reported listings** | Triage listing reports | Dismiss / reviewed / action taken; delete listing |
| **Reported reviews** | Triage review reports | Status workflow; delete review |
| **Suspensions** | Browse suspension history | Lift active suspensions |
| **Administrators** | Platform admin roster | OWNER removes ADMIN role |

## Test coverage added

| File | Scenarios |
|------|-----------|
| `AdminPanelPage.test.tsx` | Loading, login required, USER forbidden, ADMIN/OWNER review center, tab switch |
| `AdminWorkspace.test.tsx` | List/detail panes, filters, total badge |

## Existing API coverage (unchanged)

23 test files under `src/features/admin/api/` covering mutation hooks (optimistic cache, rollback) and HTTP contracts for approve/reject, reports, suspensions, admin role removal, and pending-post parsers/cache.

## Manual smoke checklist (Chrome, desktop ≥1024px)

Sign in with an **ADMIN** or **OWNER** account, then open `/admin`.

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 1 | Signed-out `/admin` | **Automated** | E2E: “Admin sign in required” + login link |
| 2 | Signed-in USER `/admin` | **Automated** | E2E: “Admin access required” |
| 3 | ADMIN loads review center | **Automated** | E2E: heading + pending tab + role badge |
| 4 | Pending tab — list + detail | **Defer** | Select submission; inspect photos/building/listing |
| 5 | Approve pending submission | **Defer** | Confirm dialog + reason; verify disappears from pending |
| 6 | Reject pending submission | **Defer** | Reject reason required |
| 7 | Building edits tab | **Defer** | Diff view; approve/reject |
| 8 | Reported listings tab | **Defer** | Status change + optional listing delete |
| 9 | Reported reviews tab | **Defer** | Status change + optional review delete |
| 10 | Suspend lister (from pending/report) | **Defer** | Duration + reason dialog |
| 11 | Lift suspension | **Defer** | Suspensions tab → lift dialog |
| 12 | Administrators tab (OWNER) | **Defer** | List admins; remove ADMIN role |
| 13 | Mobile viewport | **Defer** | `<1024px` shows “Use a larger screen” |

## Known follow-ups (non-blocking)

- **Monolith page** — `AdminPanelPage.tsx` (~4,300 lines) should be split into tab modules for maintainability.
- **No nav entry** — admins must know `/admin` URL; consider OWNER-only nav affordance later.
- **`useUpdateAdminAgentProfileVerification`** — hook exists with tests but no UI wiring (verify/unverify lister).
- **Search/detail parsers** — 5 search + 5 get-by-id API modules lack dedicated unit tests.
- **Moderation E2E** — extend smoke with mocked pending-post approve/reject once fixtures exist.
- **Backend 403** — FE gate is client-side; security relies on `/api/v1/admin/*` enforcement (assumed).

## Ship checklist

- [x] API mutation suite green (82 tests)
- [x] Page auth gates + workspace shell tests (6 new)
- [x] E2E smoke — gates + admin load (3 tests)
- [ ] Optional: desktop Chrome manual pass (checklist above)
- [ ] Optional: split `AdminPanelPage` into tab modules
- [ ] Optional: wire agent verification toggle in admin UI

## Release recommendation

**Approved for release (auth gates + admin shell)** — 2026-07-25

Admin access control and review-center shell are covered by Vitest + Playwright. Moderation actions (approve/reject/suspend/delete) remain API-tested; full desktop manual pass in Chrome is optional before heavy production moderation use.
