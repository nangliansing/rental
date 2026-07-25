# Admin panel audit — 2026-07-25

**Last updated:** 2026-07-25 (post tab-module refactor, PRs #10–#15)  
**Route:** `/admin`  
**Layout:** `RootLayout` (bottom nav) + desktop-only workspace (`lg+`)  
**Automated regression:** `npm test -- src/features/admin` → **88/88 passed**  
**E2E regression:** `e2e/admin-panel.smoke.spec.ts` → **3/3 passed**; `e2e/admin-moderation.smoke.spec.ts` → **2/2 passed**; `e2e/admin-building-edits.smoke.spec.ts` → **3/3 passed**; `e2e/admin-reported-listings.smoke.spec.ts` → **3/3 passed**; `e2e/admin-reported-reviews.smoke.spec.ts` → **3/3 passed**; `e2e/admin-suspend-lister.smoke.spec.ts` → **2/2 passed**; `e2e/admin-suspensions.smoke.spec.ts` → **3/3 passed**; `e2e/admin-platform-admins.smoke.spec.ts` → **3/3 passed** (Playwright, mocked session, 1280×900 viewport)

## Audit summary

| Area | Before | After |
|------|--------|-------|
| Test coverage | API/mutation hooks only (82 tests) | + page auth gates, workspace shell, tab switch (88 tests) |
| E2E smoke | Auth gates only (3 tests) | Auth gates + pending + building edits + reported listings + reported reviews + suspend lister + lift suspension + administrators (22 tests total) |
| Documentation | None | This audit + manual checklist |
| UI surface | Single ~4,300-line page, untested shell | **245-line shell** + 6 tab modules; auth gates and tab shell covered by tests |
| Maintainability | Monolithic `AdminPanelPage.tsx` | Tab-per-folder modules under `src/features/admin/tabs/` |

## Architecture

| Layer | Detail |
|-------|--------|
| **Route** | `/admin` — lazy-loaded `AdminPanelPage` in `router.tsx` |
| **Shell** | `AdminPanelPage.tsx` (~245 lines): auth gates, header, tab nav, tab composition |
| **Shared cross-tab** | `suspension/SuspensionActionProvider` — create-suspension dialog opened from pending / reported tabs |
| **Auth gate** | In-page: loading → `LoginRequired` → `AdminForbidden` → workspace |
| **Roles** | `OWNER` and `ADMIN` allowed; `USER` sees forbidden screen |
| **Viewport** | Desktop workspace (`hidden lg:block`); mobile shows “Use a larger screen” |
| **Navigation** | No admin link in bottom nav — direct URL `/admin` only |

### Module layout

```
src/features/admin/
├── pages/
│   └── AdminPanelPage.tsx          # shell only
├── suspension/                     # cross-tab create-suspension flow
│   ├── SuspensionActionProvider.tsx
│   └── SuspensionActionDialog.tsx
├── tabs/
│   ├── pending-listings/           # PR #10
│   ├── building-edits/             # PR #11
│   ├── reported-listings/          # PR #12
│   ├── reported-reviews/           # PR #13
│   ├── suspensions/                # PR #14 (list/detail/lift)
│   └── platform-admins/            # PR #15
├── components/                     # shared AdminWorkspace, list/detail primitives
└── api/                            # hooks + HTTP clients (23 test files)
```

Each tab module owns its queries, local context, list/detail UI, and tab-specific dialogs. The shell renders tabs conditionally and passes `onSuspendUser={openSuspensionDialog}` to moderation tabs that need it.

## Workspace tabs (6)

| Tab | Module | Purpose | Key actions |
|-----|--------|---------|-------------|
| **Pending listings** | `tabs/pending-listings/` | Review new submissions | Approve / reject with reason; suspend lister |
| **Building edits** | `tabs/building-edits/` | Review building change requests | Approve / reject with diff view |
| **Reported listings** | `tabs/reported-listings/` | Triage listing reports | Dismiss / reviewed / action taken; delete listing |
| **Reported reviews** | `tabs/reported-reviews/` | Triage review reports | Status workflow; delete review |
| **Suspensions** | `tabs/suspensions/` | Browse suspension history | Lift active suspensions |
| **Administrators** | `tabs/platform-admins/` | Platform admin roster | OWNER removes ADMIN role |

## Test coverage added

| File | Scenarios |
|------|-----------|
| `AdminPanelPage.test.tsx` | Loading, login required, USER forbidden, ADMIN/OWNER review center, tab switch |
| `AdminWorkspace.test.tsx` | List/detail panes, filters, total badge |
| `e2e/admin-moderation.smoke.spec.ts` | Pending list + detail; approve/reject with reason dialog |
| `e2e/admin-building-edits.smoke.spec.ts` | Building edits tab; current/proposed diff; approve/reject edit dialog |
| `e2e/admin-reported-listings.smoke.spec.ts` | Reported listings tab; detail view; dismiss report; delete listing |
| `e2e/fixtures/admin-moderation.ts` | Stateful pending-post mocks (GET list, PATCH approve/reject) |
| `e2e/fixtures/admin-building-edits.ts` | Stateful building-edit-request mocks (GET list/detail, PATCH approve/reject) |
| `e2e/admin-reported-reviews.smoke.spec.ts` | Reported reviews tab; detail view; dismiss report; delete review |
| `e2e/fixtures/admin-reported-listings.ts` | Stateful report mocks (GET list/detail, PATCH status, DELETE listing) |
| `e2e/admin-suspend-lister.smoke.spec.ts` | Pending tab lister menu; suspend dialog duration/reason; create suspension |
| `e2e/fixtures/admin-suspend-lister.ts` | Pending-post mocks + POST `/admin/suspensions` create handler |
| `e2e/admin-suspensions.smoke.spec.ts` | Suspensions tab; active detail; lift dialog reason chips; lift suspension |
| `e2e/fixtures/admin-suspensions.ts` | Stateful suspension mocks (GET list/detail, PATCH lift) |
| `e2e/admin-platform-admins.smoke.spec.ts` | Administrators tab (OWNER); admin detail; remove-admin dialog; PATCH remove role |
| `e2e/fixtures/admin-platform-admins.ts` | Stateful platform-admin mocks (GET list/detail, PATCH remove-admin) |

## Existing API coverage (unchanged)

25 test files under `src/features/admin/` (23 under `api/` plus page + component tests) covering mutation hooks (optimistic cache, rollback) and HTTP contracts for approve/reject, reports, suspensions, admin role removal, and pending-post parsers/cache.

Tab modules do not yet have dedicated Vitest or Playwright specs; behavior is covered indirectly via API hook tests and shell E2E smoke.

## Manual smoke checklist (Chrome, desktop ≥1024px)

Sign in with an **ADMIN** or **OWNER** account, then open `/admin`.

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 1 | Signed-out `/admin` | **Automated** | E2E: “Admin sign in required” + login link |
| 2 | Signed-in USER `/admin` | **Automated** | E2E: “Admin access required” |
| 3 | ADMIN loads review center | **Automated** | E2E: heading + pending tab + role badge |
| 4 | Pending tab — list + detail | **Automated** | E2E: seeded post; building heading in detail pane |
| 5 | Approve pending submission | **Automated** | E2E: reason chip + confirm; empty pending list |
| 6 | Reject pending submission | **Automated** | E2E: reason chip + confirm; empty pending list |
| 7 | Building edits tab | **Automated** | E2E: diff view; approve/reject with reason dialog |
| 8 | Reported listings tab | **Automated** | E2E: dismiss report + delete listing from moderation menu |
| 9 | Reported reviews tab | **Automated** | E2E: dismiss report + delete review from moderation menu |
| 10 | Suspend lister (from pending/report) | **Automated** | E2E: duration + reason dialog from pending lister menu |
| 11 | Lift suspension | **Automated** | E2E: reason chip + confirm from suspensions tab |
| 12 | Administrators tab (OWNER) | **Automated** | E2E: OWNER removes ADMIN role from administrators tab |
| 13 | Mobile viewport | **Defer** | `<1024px` shows “Use a larger screen” |

## Known follow-ups (non-blocking)

- **Tab-level E2E** — extend Playwright beyond pending, building edits, reported listings, reported reviews, suspend lister, lift suspension, and administrators (checklist item 13); tab modules are isolated and easier to test incrementally.
- **No nav entry** — admins must know `/admin` URL; consider OWNER-only nav affordance later.
- **`useUpdateAdminAgentProfileVerification`** — hook exists with tests but no UI wiring (verify/unverify lister).
- **Search/detail parsers** — 5 search + 5 get-by-id API modules lack dedicated unit tests.
- **Backend 403** — FE gate is client-side; security relies on `/api/v1/admin/*` enforcement (assumed).

## Ship checklist

- [x] API mutation suite green (82 tests)
- [x] Page auth gates + workspace shell tests (6 new)
- [x] E2E smoke — gates + admin load (3 tests)
- [x] E2E smoke — pending approve/reject (2 tests)
- [x] Split `AdminPanelPage` into tab modules (PRs #10–#15; shell ~245 lines)
- [x] E2E smoke — building edits diff/approve/reject (3 tests)
- [x] E2E smoke — reported listings dismiss/delete (3 tests)
- [x] E2E smoke — reported reviews dismiss/delete (3 tests)
- [x] E2E smoke — suspend lister from pending tab (2 tests)
- [x] E2E smoke — lift suspension from suspensions tab (3 tests)
- [x] E2E smoke — remove admin role from administrators tab (3 tests)
- [ ] Optional: desktop Chrome manual pass (checklist item 13)
- [ ] Optional: tab-level Playwright spec (mobile viewport)
- [ ] Optional: wire agent verification toggle in admin UI

## Release recommendation

**Approved for release (auth gates + admin shell + modular tabs)** — 2026-07-25

Admin access control, review-center shell, and pending-listing approve/reject flows are covered by Vitest + Playwright. Building edits, reports, suspensions, and admin roster actions remain API-tested; full desktop manual pass in Chrome is optional before heavy production moderation use. The page monolith has been split into maintainable tab modules without changing user-facing behavior.
