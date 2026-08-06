# Search agent demand opportunities

Finds active SavedSearch demand intersecting an agent-provided geographic area,
classifies matching inventory, calculates an opportunity score, and returns a
ranked, paginated result.

```http
POST /api/v1/agent-demand-opportunities/search
Authorization: Bearer <access-token>
Content-Type: application/json
```

## Access requirements

The route applies the following middleware in order:

1. Search rate limiting.
2. Access-token authentication.
3. Active-account enforcement.
4. Non-deleted AgentProfile enforcement.

The caller's User ID identifies caller-owned listings. SavedSearch
`agentProfileIds` are resolved to User IDs before listing matching.

## Request body

```json
{
  "area": {
    "type": "Point",
    "coordinates": [100.5018, 13.7563],
    "coverageMeters": 3000
  },
  "matchStatus": "unmatched",
  "pagination": {
    "page": 1,
    "limit": 20
  }
}
```

| Field | Required | Description |
| --- | --- | --- |
| `area` | Yes | GeoJSON search area used to find intersecting SavedSearch coverage. |
| `matchStatus` | No | `matched` or `unmatched`. Omit to return both. |
| `pagination.page` | Yes | Integer from 1 through 10,000. |
| `pagination.limit` | Yes | Integer from 1 through 100. |

Unknown body, area, and pagination fields are rejected.

### Supported areas

Coordinates always use GeoJSON order: `[longitude, latitude]`.

#### Point

```json
{
  "type": "Point",
  "coordinates": [100.5018, 13.7563],
  "coverageMeters": 3000
}
```

#### LineString

```json
{
  "type": "LineString",
  "coordinates": [
    [100.50, 13.75],
    [100.55, 13.77]
  ],
  "coverageMeters": 700
}
```

#### MultiLineString

```json
{
  "type": "MultiLineString",
  "coordinates": [
    [[100.50, 13.75], [100.55, 13.77]],
    [[100.56, 13.72], [100.60, 13.74]]
  ],
  "coverageMeters": 700
}
```

#### Polygon

```json
{
  "type": "Polygon",
  "coordinates": [[
    [100.50, 13.72],
    [100.60, 13.72],
    [100.60, 13.80],
    [100.50, 13.80],
    [100.50, 13.72]
  ]]
}
```

#### MultiPolygon

```json
{
  "type": "MultiPolygon",
  "coordinates": [
    [[
      [100.50, 13.72],
      [100.60, 13.72],
      [100.60, 13.80],
      [100.50, 13.80],
      [100.50, 13.72]
    ]]
  ]
}
```

`coverageMeters` is required for Point, LineString, and MultiLineString and
must be an integer from 100 through 50,000. It is rejected for Polygon and
MultiPolygon.

Lines must contain at least two distinct positions. Polygon rings must be
closed, contain at least three distinct positions, enclose non-zero area, and
must not self-intersect. Holes must be contained by the exterior ring and must
not intersect or contain other holes. Geometry complexity limits are enforced.

## Geographic semantics

There are two independent geographic operations:

1. The request area intersects `SavedSearch.geoSearch.coverage` to select
   candidate SavedSearches.
2. For each candidate, an active Building's Point location must be inside that
   SavedSearch's own coverage before any listing can count.

The request area does not replace the SavedSearch coverage when matching
buildings.

Only SavedSearches with `status: "Waiting"` and `isDeleted: false` are eligible.

## Building matching

A Building must:

- Be active.
- Be geographically inside the SavedSearch coverage.
- Equal `filters.buildingType` when supplied.
- Contain every requested `filters.buildingFacilities` value when supplied.
- Contain every requested `filters.security` value when supplied.

Persisted empty filter arrays are treated as omitted filters.

## Listing matching

A Listing must be public, not deleted, belong to the matching Building, and
satisfy every SavedSearch filter that is present.

| SavedSearch filter | Listing rule |
| --- | --- |
| `minRent` | `rent >= minRent` |
| `maxRent` | `rent <= maxRent` |
| `contractMonths` | `contractMonths <= requested contractMonths` |
| `occupancy` | `occupancy >= requested occupancy` |
| `isForeignerAccepted` | Exact Boolean match |
| `isTM30Provided` | Exact Boolean match |
| `bedroomCount: 0` | Exact zero-bedroom match |
| `bedroomCount > 0` | Listing bedrooms greater than or equal to requested |
| `bathroomCount` | Listing bathrooms greater than or equal to requested |
| `kitchenType: "Kitchen"` | Accepts `Kitchen` and `Separate Kitchen` |
| Other `kitchenType` | Exact match |
| `isCookingAllowed` | Exact Boolean match |
| `isPetAllowed` | Exact Boolean match |
| `listingFacilities` | Listing must contain every requested value |
| `availableBy` | `availableAt` is null/flexible or on/before the requested date |

The listing's AgentProfile must not be deleted and its User must be active.
When `supportLanguages` is present, the profile must support at least one
requested language. When `agentProfileIds` is present, the listing owner must
resolve from one of those profiles.

## Matching counts

Each Building contributes to at most one count:

- `myMatchingBuildingCount`: at least one matching listing belongs to the
  authenticated caller.
- `platformMatchingBuildingCount`: a matching platform listing exists, but no
  matching caller-owned listing exists for that Building.

Caller ownership wins when both caller and platform listings match in the same
Building.

Counting is bounded to 20 matching Buildings per returned SavedSearch. The API
reads one extra classification to determine whether the result was truncated:

```json
{
  "myMatchingBuildingCount": 4,
  "platformMatchingBuildingCount": 16,
  "matchingBuildingCountCapped": true
}
```

When `matchingBuildingCountCapped` is `true`, the two counts describe the first
20 classified Buildings and must not be displayed as exact totals.

## Match status

Match status is based on an uncapped caller-listing existence check:

- `matched`: retain opportunities with at least one caller-owned matching
  Building.
- `unmatched`: retain opportunities with no caller-owned matching Building.
- Omitted: retain both groups.

Filtering occurs before pagination. `pagination.total` therefore represents
the filtered result, and a page is never shortened by post-pagination status
filtering.

## Opportunity ranking

Only unmatched opportunities are ranked. Matched opportunities return
`opportunityRanking: null` because the caller already has suitable inventory.

```text
score = inventoryGapScore × 0.65 + freshnessScore × 0.35
```

The public score is rounded to six decimal places. Ranking policy version `v1`
uses the following bands.

### Inventory gap component

| Platform matching Buildings | Component score |
| --- | --- |
| 0 | 1.0 |
| 1 | 0.8 |
| 2–3 | 0.6 |
| 4–5 | 0.4 |
| 6–10 | 0.2 |
| More than 10 | 0.1 |

Ranking only needs to inspect up to 11 platform Buildings because all larger
counts share the same component score.

### Freshness component

Freshness uses `lastConfirmedAt`, falling back defensively to `createdAt` for a
legacy record. One `now` value is captured for the complete request.

| Confirmation age | Component score |
| --- | --- |
| Up to 1 day | 1.0 |
| Up to 3 days | 0.9 |
| Up to 7 days | 0.7 |
| Up to 14 days | 0.4 |
| Up to 21 days | 0.2 |
| Older than 21 days | 0.05 |

Invalid timestamps receive a freshness component of zero. Future timestamps
are treated as age zero.

### Sorting

Results use deterministic ordering:

1. Opportunity score descending. Matched/null rankings sort last.
2. `lastConfirmedAt`, or the defensive `createdAt` fallback, descending.
3. `createdAt` descending.
4. `_id` ascending.

Ranking and match-status filtering occur before pagination.

## Success response

```json
{
  "success": true,
  "data": [
    {
      "_id": "6a743568c2bb601801284355",
      "name": "Siam renter demand",
      "status": "Waiting",
      "geoSearch": {
        "mode": "area",
        "bounds": {
          "northEast": { "lat": 13.751, "lng": 100.541 },
          "southWest": { "lat": 13.743, "lng": 100.532 }
        },
        "placeName": "Siam"
      },
      "filters": {
        "minRent": 15000,
        "maxRent": 30000,
        "bedroomCount": 1
      },
      "createdAt": "2026-08-04T07:30:00.000Z",
      "updatedAt": "2026-08-06T07:30:00.000Z",
      "lastConfirmedAt": "2026-08-04T07:30:00.000Z",
      "myMatchingBuildingCount": 0,
      "platformMatchingBuildingCount": 1,
      "matchingBuildingCountCapped": false,
      "opportunityRanking": {
        "score": 0.835,
        "inventoryGapScore": 0.8,
        "freshnessScore": 0.9,
        "policyVersion": "v1"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

The endpoint uses an explicit response allowlist. It does not return:

- `title`
- `description`
- `createdBy`
- `isDeleted`, `deletedAt`, or other deletion metadata
- `geoSearch.coverage`
- Internal match-state fields

These fields remain excluded even if a legacy raw document contains them.

An empty page is successful and preserves the filtered total:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 13
  }
}
```

## Performance and safety limits

- SavedSearch coverage uses the partial `2dsphere` index for active searches.
- Building location uses its `2dsphere` index.
- Caller matching starts from indexed caller listings and stops after one
  qualifying Building.
- Platform ranking stops after 11 Buildings.
- Full response counts stop after 20 Buildings plus one truncation probe.
- Candidate and enrichment work runs with concurrency limited to three.
- Each MongoDB aggregation has a five-second maximum execution time.
- A request may match at most 100 SavedSearch candidates before status
  filtering. The query reads candidate 101 only to detect overflow.

If more than 100 candidates intersect the request area, the endpoint returns:

```json
{
  "success": false,
  "code": "OPPORTUNITY_CANDIDATE_LIMIT_EXCEEDED",
  "message": "Ranking is limited to 100 SavedSearch candidates; narrow the search area",
  "requestId": "..."
}
```

The status is `422 Unprocessable Entity`. Clients should ask the user to narrow
the requested area.

## Error responses

All controlled errors use this shape:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "matchStatus must be matched or unmatched",
  "requestId": "..."
}
```

| HTTP status | Code | Meaning |
| --- | --- | --- |
| 400 | `INVALID_JSON` | Request body is not valid JSON. |
| 401 | `ACCESS_TOKEN_REQUIRED` | Bearer access token is missing. |
| 401 | `INVALID_ACCESS_TOKEN` | Access token is invalid or expired. |
| 403 | `ACCOUNT_INACTIVE` | User account is inactive. |
| 403 | `ACCOUNT_SUSPENDED` | User account is suspended. |
| 403 | `AGENT_PROFILE_REQUIRED` | Active caller has no non-deleted AgentProfile. |
| 422 | `VALIDATION_ERROR` | Body, pagination, status, or geometry is invalid. |
| 422 | `OPPORTUNITY_CANDIDATE_LIMIT_EXCEEDED` | Area intersects more than 100 candidates. |
| 429 | Rate-limit error | Search rate limit exceeded. |

Unexpected database details, aggregation internals, and stack traces are never
returned in controlled client errors.

## Client guidance

- Use `matchStatus: "unmatched"` for the actionable opportunity queue.
- Treat `opportunityRanking` as nullable.
- Use `policyVersion` when analyzing score changes over time.
- Display capped counts as `20+` or equivalent when
  `matchingBuildingCountCapped` is true.
- Narrow the geographic area when the candidate-limit error is returned.
- Do not calculate pagination totals from the current page length; use
  `pagination.total`.
