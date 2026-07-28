# Listing `availableBy` (Search Filter)

Shared search-filter semantics for the four filtered building/listing search endpoints.

## Field

| Name | Type | Required |
| --- | --- | --- |
| `availableBy` | omitted, `null`, or date string | no |

## Meaning

Renter needs a room **by/on this date**.

Keep listings where:

- `availableAt` is Flexible (`null` / missing), or
- `availableAt <= availableBy` (Thailand calendar day)

## Input Rules

| Input | Behavior |
| --- | --- |
| omitted | no date filter |
| `null` | no date filter |
| valid date (for example `"2026-08-15"`) | normalize to Thailand start of day and apply match |
| empty / invalid | `422 VALIDATION_ERROR` |

Dates use `Asia/Bangkok` (Thailand national time, UTC+7), same as listing `availableAt` write validation.

## Example

Renter sends:

```json
{
  "availableBy": "2026-08-15"
}
```

| Listing `availableAt` | Included |
| --- | --- |
| `null` (Flexible) | yes |
| `2026-08-10` | yes |
| `2026-08-15` | yes |
| `2026-08-20` | no |

## Affected Endpoints

- `POST /api/v1/search/buildings/map`
- `POST /api/v1/search/buildings/nearby`
- `POST /api/v1/search/buildings/near-lines`
- `POST /api/v1/search/buildings/:buildingId/listings`

Implemented once in:

- `buildSearchListingFilters`
- `buildListingFilterMatch`
