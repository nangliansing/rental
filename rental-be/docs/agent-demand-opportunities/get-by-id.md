# Get agent demand opportunity by ID

Fetches one Waiting, non-deleted SavedSearch as a public agent demand opportunity,
including matching-building counts. Owner-private fields are never returned.

```http
GET /api/v1/agent-demand-opportunities/:opportunityId
Authorization: Bearer <access-token>
```

Full local URL:

```http
GET http://localhost:3000/api/v1/agent-demand-opportunities/6a70f2002c0e518d5b689200
```

## Access requirements

The route applies the following middleware in order:

1. Access-token authentication.
2. Active-account enforcement.
3. Non-deleted AgentProfile enforcement.

App-level read rate limiting applies. This route does **not** use the search
rate limiter (reserved for `POST /search`).

The caller's User ID identifies caller-owned listings when computing matching
building counts. SavedSearch `agentProfileIds` are resolved to User IDs before
listing matching.

## Path parameters

| Name | Required | Validation |
| --- | --- | --- |
| `opportunityId` | yes | Valid MongoDB ObjectId |

## Eligibility

The query matches:

```js
{
  _id: opportunityId,
  status: "Waiting",
  isDeleted: false,
}
```

These cases all return the same `AGENT_DEMAND_OPPORTUNITY_NOT_FOUND` response:

- the SavedSearch does not exist
- the SavedSearch is soft-deleted
- the SavedSearch status is not `Waiting` (for example `Closed`)

There is no ownership check and no geo area re-check. Any authenticated agent
with an AgentProfile may fetch an eligible opportunity by id.

## Session

Optional Mongo session is accepted when present (`req.dbSession`).

## Success output

Status:

```http
200 OK
```

Body:

```json
{
  "success": true,
  "data": {
    "_id": "6a70f2002c0e518d5b689200",
    "status": "Waiting",
    "filters": {
      "minRent": 15000,
      "bedroomCount": 1
    },
    "geoSearch": {
      "mode": "area",
      "bounds": {
        "northEast": { "lat": 13.78, "lng": 100.66 },
        "southWest": { "lat": 13.75, "lng": 100.62 }
      },
      "placeName": null
    },
    "createdAt": "2026-08-04T07:30:00.000Z",
    "updatedAt": "2026-08-06T07:30:00.000Z",
    "lastConfirmedAt": "2026-08-04T07:30:00.000Z",
    "myMatchingBuildingCount": 0,
    "platformMatchingBuildingCount": 1,
    "matchingBuildingCountCapped": false
  }
}
```

The endpoint uses the same explicit response allowlist as search. It does not
return:

- `name`
- `title`
- `description` / note
- `createdBy`
- `isDeleted`, `deletedAt`, or other deletion metadata
- `geoSearch.coverage`
- Internal match-state fields
- `opportunityRanking` (ranking is search-only)

These fields remain excluded even if a legacy raw document contains them.

## Error responses

Missing or invalid access token:

```http
401 Unauthorized
```

Inactive / suspended account, or missing AgentProfile:

```http
403 Forbidden
```

```json
{
  "success": false,
  "code": "AGENT_PROFILE_REQUIRED",
  "message": "..."
}
```

Opportunity missing, Closed, or soft-deleted:

```http
404 Not Found
```

```json
{
  "success": false,
  "code": "AGENT_DEMAND_OPPORTUNITY_NOT_FOUND",
  "message": "Agent demand opportunity not found"
}
```

Invalid path id:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "opportunityId must be a valid id"
}
```

## Manual test checklist

- [ ] Agent can fetch a Waiting opportunity by id
- [ ] Response includes matching building counts
- [ ] Response omits `name`, `description`, `createdBy`, and `geoSearch.coverage`
- [ ] Soft-deleted opportunity returns `404 AGENT_DEMAND_OPPORTUNITY_NOT_FOUND`
- [ ] Closed opportunity returns `404 AGENT_DEMAND_OPPORTUNITY_NOT_FOUND`
- [ ] Unknown id returns `404 AGENT_DEMAND_OPPORTUNITY_NOT_FOUND`
- [ ] Invalid id returns `422 VALIDATION_ERROR`
- [ ] Missing AgentProfile returns `403 AGENT_PROFILE_REQUIRED`
- [ ] Unauthenticated request returns `401`
