# Listing `availableAt` (Response Field)

Shared response semantics for listing payloads returned by fetch endpoints.

Write semantics for create/update live in:

- [`docs/pending-post/create-pending-post.md`](../pending-post/create-pending-post.md)
- [`docs/listing/owner-update-listing.md`](../listing/owner-update-listing.md)

## Field

| Name | Type | Always present |
| --- | --- | --- |
| `availableAt` | `string` (ISO datetime) or `null` | yes |

## Stored Meaning

| Stored value | Meaning |
| --- | --- |
| `null` | Flexible / unknown |
| date | Available from that Thailand calendar day |

Dates are stored and compared as the start of the calendar day in `Asia/Bangkok` (Thailand national time, UTC+7).

## Client Display Guidance

| Value | Suggested label |
| --- | --- |
| `null` | Flexible |
| date ≤ today (Thailand) | Available now |
| date > today (Thailand) | Available from {date} |

## Example Values

```json
{
  "availableAt": null
}
```

```json
{
  "availableAt": "2026-08-14T17:00:00.000Z"
}
```

`2026-08-14T17:00:00.000Z` is the UTC form of `2026-08-15T00:00:00+07:00` (Thailand start of day).

## Affected Fetch Endpoints

- `GET /api/v1/listings` — also uses `availableAt` for owner `filter=now` / `filter=soon` matching and `filter=soon` sorting. See [`owner-search-listing.md`](./owner-search-listing.md).
- `GET /api/v1/listings/:listingId`
- `GET /api/v1/search/listings/:listingId`
- `GET /api/v1/search/agents/:agentProfileId/listings`
- `POST /api/v1/search/buildings/:buildingId/listings`
- `POST /api/v1/search/buildings/map`
- `POST /api/v1/search/buildings/near-lines`
- `POST /api/v1/search/buildings/nearby`
- `GET /api/v1/saved-listings`
- `GET /api/v1/pending-posts`
- `GET /api/v1/admin/pending-posts`
- `GET /api/v1/admin/reports`
- `GET /api/v1/admin/reports/:reportId`
