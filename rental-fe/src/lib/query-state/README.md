# Query state management

How we update React Query cache data after mutations — safely, consistently, and without crashes.

---

## What problem this solves

When a user creates, edits, or deletes something, the UI should update immediately (optimistic update) instead of waiting for the server. That means patching cached query data in many places at once: list pages, detail views, nested objects inside other responses.

This system provides **small, defensive building blocks** for those patches. Domain files (e.g. `listingMutationCache.ts`) decide *what* to change; `query-state` handles *how* to change it without breaking the cache.

---

## How it is built (three layers)

```
┌─────────────────────────────────────────────────────────┐
│  Mutation hooks (useUpdateMyAgentProfile, etc.)         │
│  cancel → snapshot → apply → reconcile / rollback       │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  Domain cache modules (*MutationCache.ts)               │
│  query keys, matchers, business rules                   │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  query-state primitives (this folder)                   │
│  updateSingle, updateInFlatList, updateDeep, …          │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  shared.ts — defensive helpers                          │
│  safe reads, copy-on-write, never throw                 │
└─────────────────────────────────────────────────────────┘
```

**Related (not in this folder):**

- `lib/optimistic-transaction.ts` — standard cancel / snapshot / apply / rollback flow for mutations
- `lib/query-cache-snapshot.ts` — capture and restore cache entries by query key
- `lib/query-keys.ts` — centralized query key factory

---

## Core ideas

### 1. Matcher + updater

Every patch needs two functions:

- **Matcher** — “Is this the record I want?” `(value) => boolean`
- **Updater** — “What should it become?” `(current) => next`

Domain modules add **shape guards** so `_id` alone is not enough (e.g. a listing must have `visibility`, a profile must have `displayName` or `userId`).

### 2. Two function forms

| Form | Use when |
|------|----------|
| `updateX(current, match, update)` | Patching one cache value inside `setQueryData` |
| `updateXInQueries(client, keys, match, update)` | Patching every cached query under those key prefixes |

Same pattern for `remove`, `add`, etc.

### 3. Defensive by default

All primitives:

- **Never throw** — bad data or a failing matcher leaves the cache unchanged
- **Copy-on-write** — unchanged parts keep the same object references
- **Atomic per cache entry** — if any part of a value cannot be read safely, the whole entry is left alone

---

## Primitives (pick the smallest one that fits)

### Single resource

Top-level object only (e.g. `profiles.me`).

| Primitive | Does |
|-----------|------|
| `updateSingle` | Replace fields on one matched object |
| `removeSingle` | Clear the query value (e.g. after delete) |

### Flat list — `{ data: T[], pagination? }`

| Primitive | Does |
|-----------|------|
| `addToFlatList` | Prepend or append an item |
| `updateInFlatList` | Patch matching items in `data` |
| `removeFromFlatList` | Remove matching items from `data` |

### Infinite list — `{ pages, pageParams }`

Each page is `{ data: T[] }` or a bare `T[]`.

| Primitive | Does |
|-----------|------|
| `addToInfiniteList` | Add to page 1 only |
| `updateInInfiniteList` | Patch matching items on every loaded page |
| `removeFromInfiniteList` | Remove matching items on every loaded page; drops `pagination.total` on all pages by the global removed count |

### Any depth — nested projections

For records embedded inside other responses (listing inside saved row, agent profile inside map results, etc.).

| Primitive | Does |
|-----------|------|
| `updateDeep` | Find every matching record anywhere in the tree and patch it |
| `removeDeep` | Find and remove matching records from arrays at any depth |

---

## How a mutation uses it (typical flow)

1. **Cancel** in-flight queries for affected keys (avoid refetch overwriting optimism)
2. **Snapshot** current cache data (for rollback)
3. **Apply** optimistic patches via domain cache helpers → `query-state` primitives
4. **On success** — reconcile with server response (patch again with authoritative data)
5. **On error** — restore snapshot
6. **On settled** — invalidate active queries so lists refetch if needed

Most hooks use `createOptimisticTransaction` from `lib/optimistic-transaction.ts` for steps 1–5.

---

## Domain cache module pattern

Each feature has a `*MutationCache.ts` file that owns:

1. **Which query keys** can contain the entity (`relatedListingQueryKeys`, `profileProjectionQueryKeys`, …)
2. **Matchers** with shape guards (`isListingRecord`, `isAgentProfileProjection`, …)
3. **Public functions** hooks call (`patchListingInRelatedQueries`, `updateAgentProfileProjections`, …)

Example (listing patch):

```ts
updateDeepInQueries(
  queryClient,
  relatedListingQueryKeys(listingId),
  isListingRecord(listingId),
  (listing) => ({ ...listing, ...changes }),
)
```

Hooks stay thin: they call domain helpers, not primitives directly (except for simple cases).

---

## Special shapes (domain code stays in domain files)

Some caches do not fit a generic primitive alone. Domain modules wrap primitives or add custom logic:

| Case | Approach |
|------|----------|
| Lister reviews `{ myReview, reviews }` | Custom page reader + `tryFilterMatchingItems` / `tryMapMatchingItems` from `shared.ts` |
| Owner pending-post insert | Custom page re-slice (server owns page boundaries); remove/transition use `updateInInfiniteList` / `removeFromInfiniteList` |
| Admin pending post | Same as owner for remove/transition; no optimistic insert |
| Profile / user / review summary | `updateDeepInQueries` + local summary math |
| Admin building edit requests | `lib/status-transition-cache.ts` (status filter in/out of list) |

---

## Pagination note

For standard infinite lists, **`pagination.total` is treated as a global total** repeated on each page. When items are removed, every loaded page’s total is reduced by the count removed across all pages.

Do not use `addToInfiniteList` when the server owns page boundaries and a prepend must re-slice all pages — use domain-specific insert logic instead.

---

## What is migrated vs not

**On query-state (production-ready):**

- Listing, saved listing, building, profile
- Lister review (patches + summary; list remove uses shared list helpers)
- Owner + admin pending posts
- Admin user, platform admin, report listing projections

**Still separate:**

- `lib/status-transition-cache.ts` — admin status-filtered lists
- `features/notifications/api/notificationCache.ts` — unread counts and merge logic
- Inline `markReviewDeleted` in admin delete-review hook

---

## Adding a new domain cache

1. List every query key family that might embed the entity
2. Write a matcher with a shape guard (not just `_id`)
3. Choose the smallest primitive (single → flat → infinite → deep)
4. Export one or two functions for hooks to call
5. Wire through `createOptimisticTransaction` with cancel / snapshot / invalidate keys
6. Add tests: unit tests for the cache module + hook tests for optimistic / rollback / success paths

---

## Tests

- **852+ tests** in `src/lib/query-state/` cover primitives, edge cases, and hostile inputs
- Each domain `*MutationCache.test.ts` covers real shapes and hook integration tests cover end-to-end mutation behavior

Run:

```bash
npx vitest run --config vitest.config.ts src/lib/query-state
```
