# Search agent demand opportunities

`POST /api/v1/agent-demand-opportunities/search`

Returns active, non-deleted SavedSearches whose internal coverage geometry
intersects an agent-provided area. The caller must be authenticated, active,
and have a non-deleted agent profile.

## Request

```json
{
  "area": {
    "type": "Point",
    "coordinates": [100.5018, 13.7563],
    "coverageMeters": 3000
  },
  "pagination": {
    "page": 1,
    "limit": 20
  }
}
```

`area.type` supports:

- `Polygon` and `MultiPolygon`: provide valid closed GeoJSON coordinates.
- `Point`: provide `[longitude, latitude]` and `coverageMeters`.
- `LineString` and `MultiLineString`: provide GeoJSON coordinates and
  `coverageMeters`.

`coverageMeters` must be an integer from 100 through 50,000. Pagination is
required; `page` is 1–10,000 and `limit` is 1–100. Unknown fields are rejected.

`matchStatus` is intentionally unsupported until agent-specific matching has
a defined persistence model.

## Response

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0
  }
}
```

The response omits the SavedSearch owner, deletion metadata, and derived
`geoSearch.coverage`. Results are sorted by newest first with `_id` as a stable
tie-breaker.
