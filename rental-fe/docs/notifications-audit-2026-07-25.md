# Notifications audit — 2026-07-25

**Surface:** bottom nav bell (`NotificationBellButton`) + `NotificationProvider`  
**Automated regression:** `npm test -- src/features/notifications` → **13/13 passed**  
**E2E regression:** `e2e/notifications.smoke.spec.ts` → **3/3 passed** (Playwright, mocked session)

## Audit summary

| Area | Before | After |
|------|--------|-------|
| Test coverage | Mark-read mutation only (3 tests) | + parser, cache, bell UI tests (13 total) |
| E2E smoke | None | Signed-out hidden, empty panel, unread badge clear |
| API mock shape | Wrong `{ notifications: [] }` wrapper in session fixture | Fixed to `{ data: [], unreadCount }` |
| Documentation | None | This audit + manual checklist |

## Architecture

| Layer | Detail |
|-------|--------|
| **Provider** | `NotificationProvider` — infinite query + Socket.IO live updates |
| **UI** | `NotificationBellButton` in `AppNavigation` (desktop + mobile “Noti”) |
| **Fetch** | `GET /notifications/me?page&limit` + `unreadCount` |
| **Read** | Opening panel calls `markAllAsRead` → `PATCH /notifications/me/read-all` |
| **Live** | Socket event `notification:new` merges into React Query cache |
| **Auth** | Enabled only when user is authenticated and `ACTIVE` |

## Notification types supported in UI (19)

Pending listing approve/reject, listing delete/visibility, building edit approve/reject, report statuses, suspension/lift, admin role removed, saved listing price/availability, review received/reply/removed, system fallback.

## Test coverage added

| File | Scenarios |
|------|-----------|
| `getMyNotifications.test.ts` | Parse complete payload; safe defaults |
| `notificationCache.test.ts` | Merge socket event, ignore expired, mark read, rollback |
| `NotificationBellButton.test.tsx` | Default label, unread badge, mark-read on open, link navigation |

## Existing coverage (unchanged)

| File | Scenarios |
|------|-----------|
| `useMarkMyNotificationsRead.test.tsx` | Optimistic read, rollback with concurrent socket event, invalidation |

## Manual smoke checklist (Chrome)

Sign in with Google, then verify on any signed-in page with bottom nav:

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 1 | Signed-out — no bell | **Automated** | E2E on `/profile` gate |
| 2 | Empty panel | **Automated** | E2E: “No notifications yet” |
| 3 | Unread badge + open panel | **Automated** | E2E: badge clears after open |
| 4 | Click notification link | **Automated** | Vitest: navigates to `/profile?tab=saved` |
| 5 | Live socket delivery | **Defer** | Requires backend socket + real event |
| 6 | Infinite scroll load more | **Defer** | Needs >20 notifications |
| 7 | Listing-deleted message formatting | **Defer** | Metadata reason + listing label |
| 8 | Mobile “Noti” tab affordance | **Defer** | Narrow viewport manual pass |

## Known follow-ups (non-blocking)

- **NotificationProvider UI tests** — socket connect/disconnect states untested (mock `socket.io-client`).
- **Live E2E** — socket push not covered; depends on backend + WebSocket in CI.
- **Saved-listing price-change path** — noted in `saved-listing-smoke-run`; end-to-end trigger untested in browser.
- **Provider error/retry UI** — bell panel has loading/empty states; fetch error path not surfaced in UI tests.

## Ship checklist

- [x] Parser + cache + bell component tests green (13)
- [x] Fix notifications API mock shape in session fixture
- [x] E2E smoke — empty + unread flows (3 tests)
- [ ] Optional: live socket manual pass with backend running
- [ ] Optional: saved-listing price-change notification in real Chrome

## Release recommendation

**Approved for release (notifications shell)** — 2026-07-25

Bell affordance, fetch/mark-read, and empty/unread panel flows are covered by Vitest + Playwright. Live socket delivery remains optional manual follow-up before relying on real-time alerts in production.
