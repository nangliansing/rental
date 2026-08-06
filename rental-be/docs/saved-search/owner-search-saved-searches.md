# Get My Saved Searches

List non-deleted saved searches owned by the authenticated user.

Results are sorted by `filters.availableBy` sooner-first. Requests without `availableBy` are sorted last, with `createdAt` (newest first) as the fallback.

## Endpoint

```http
GET /api/v1/saved-searches
```

Full local URL:

```http
GET http://localhost:3000/api/v1/saved-searches
```

## Auth

Requires an active user access token.

```http
Authorization: Bearer ACCESS_TOKEN
```

The route uses:

```txt
authenticate
requireActiveUser
```

Suspended, inactive, deleted, or missing users cannot access this endpoint.

## Query Parameters

All query parameters are optional.

| Name | Default | Notes |
| --- | --- | --- |
| `page` | `1` | Integer from `1` to `10000` |
| `limit` | `20` | Integer from `1` to `100` |
| `status` | `Waiting` | One of `Waiting`, `Closed` |

Example:

```http
GET http://localhost:3000/api/v1/saved-searches?page=1&limit=20&status=Waiting
```

## Ownership And Soft Delete

The query always matches:

```js
{
  createdBy: currentUserId,
  isDeleted: false
}
```

Soft-deleted requests and other users' requests are never returned.

When `status` is omitted, the match defaults to `Waiting`.

## Sort

Default sort (fixed; no client sort param):

```txt
1. rows with filters.availableBy first
2. sooner availableBy dates first
3. rows without availableBy last
4. createdAt newest first, then _id, as fallback
```

Mongo ascending nulls would otherwise put missing dates first, so the pipeline uses a temporary `_hasAvailableBy` flag for nulls-last ordering and strips it from the response.

## Indexes

Compound index supporting this owner list:

```js
{ createdBy: 1, isDeleted: 1, status: 1, "filters.availableBy": 1, createdAt: -1, _id: 1 }
```

`SavedSearch` is registered in `scripts/database/index-models.js` so `npm run db:indexes:create` applies them.

## Success Output

Status:

```http
200 OK
```

Body:

```json
{
  "success": true,
  "data": [
    {
      "_id": "6a70f2002c0e518d5b689200",
      "createdBy": "6a5638bafc6d6328c9e1b281",
      "name": "Sukhumvit 2BR",
      "description": "Near BTS",
      "status": "Waiting",
      "geoSearch": {
        "mode": "area",
        "bounds": {
          "northEast": { "lat": 13.78, "lng": 100.66 },
          "southWest": { "lat": 13.75, "lng": 100.62 }
        },
        "placeName": "Phrom Phong"
      },
      "filters": {
        "minRent": 15000,
        "maxRent": 35000,
        "availableBy": "2026-09-01T17:00:00.000Z"
      },
      "isDeleted": false,
      "deletedAt": null,
      "createdAt": "2026-08-03T18:00:00.000Z",
      "updatedAt": "2026-08-03T18:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

An empty result set returns `data: []` with `pagination.total: 0`.

## Error Responses

Missing or invalid access token:

```http
401 Unauthorized
```

Inactive / suspended account:

```http
403 Forbidden
```

Invalid query values:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid status: Open"
}
```

## Manual Test Checklist

- [ ] Owner sees only their non-deleted requests
- [ ] Soft-deleted requests are excluded
- [ ] omitted `status` defaults to Waiting and excludes Closed
- [ ] `status=Waiting` / `status=Closed` filters correctly
- [ ] Requests with earlier `availableBy` appear first
- [ ] Requests without `availableBy` appear last
- [ ] Pagination `page` / `limit` / `total` are correct
- [ ] Suspended / inactive users are rejected
