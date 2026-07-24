# Lister profile audit — 2026-07-25

**Route:** `/listers/:agentProfileId`  
**Fixture:** `/listers/6a5e8066ea0f16347dcc66d5` (Nang Lian Sing)  
**Automated regression:** `npm test -- src/features/agent` → **17/17 passed**

## Audit summary

| Area | Before | After |
|------|--------|-------|
| Test coverage | Route title only | Parser, header, tabs, page integration (17 tests) |
| Online indicator | `isActive` (defaults true) | `isOnline` — aligned with My Profile |
| Profile fetch errors | All → "Lister not found" | 404 → not found; other errors → retry UI |
| Listings fetch | Always on mount | Lazy — only when Listings tab active |
| Share URL helper | Duplicated in header + modal | Shared `getListerProfileUrl` |

## P0 fixes shipped

1. **Online status** — `ListerProfileHeader` uses `profile.isOnline` + "Online lister" (matches `MyProfileHeader`).
2. **Error differentiation** — `ListerProfilePage` shows retry for 5xx/network; 404/`AGENT_PROFILE_NOT_FOUND` → not found.
3. **Lazy listings query** — `useSearchListingsByAgent` enabled only when Listings tab is active and profile loaded.
4. **DRY share URL** — `src/features/agent/utils/listerProfileUrl.ts` used by header and `MyProfileShareModal`.

## Test coverage added

| File | Scenarios |
|------|-----------|
| `listerProfileParsers.test.ts` | Parse/normalize, null userId, missing id throws |
| `listerProfileUrl.test.ts` | SSR path + browser absolute URL |
| `ListerProfileHeader.test.tsx` | Identity, contacts, stats, share modal, empty contacts |
| `ListerProfileTabs.test.tsx` | Tab selection, sort visibility, sort change |
| `ListerProfilePage.test.tsx` | Load, 404, retry, reviews tab without listings refetch |

## Manual smoke checklist (Chrome)

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 1 | Load valid lister profile | **Pass** | Prior run on fixture lister |
| 2 | Phone contact confirm | **Pass** | Confirm dialog + copy flow |
| 3 | Listing grid → modal | **Pass** | Save + Phone + Directions in modal |
| 4 | Share profile button renders | **Pass** | Modal open/copy/QR not exercised in Cursor browser |
| 5 | Reviews tab | **Defer** | Needs signed-in session for write review |
| 6 | Invalid lister ID | **Automated** | 404 → "Lister not found" |
| 7 | Network error retry | **Automated** | Retry button refetches profile |

## Route architecture (2026-07-25)

Lister profile (`/listers/:agentProfileId`) uses `StandalonePageLayout` (shared back/home/profile header, no bottom nav). See `docs/navigation-layout-smoke-2026-07-25.md`.

## Known follow-ups (non-blocking)

- ~~**Recommend tab** — disabled placeholder~~ removed; only Listings + Reviews tabs remain.
- **Dual contact UX** — own profile uses copy chips; public profile uses `ContactActions` confirm flow (intentional).
- **Share modal manual pass** — copy link, QR save, external share links in real Chrome.
- **`userId` null** — if public API omits `userId`, review creation is hidden (verify with backend).

## Ship checklist

- [x] P0 fixes (online status, errors, lazy fetch, share URL DRY)
- [x] Parser + component + page tests green (17)
- [x] Manual smoke — contacts + listing modal (prior run)
- [ ] Optional: share modal full manual pass
- [ ] Optional: reviews tab with signed-in reviewer

## Release recommendation

**Approved for release** — lister profile public surface is covered by automated tests and prior manual contact/grid smoke. Optional share-modal and review-write passes can follow in Chrome.
