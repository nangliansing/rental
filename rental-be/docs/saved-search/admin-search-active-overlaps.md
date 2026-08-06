# Search Active Saved Searches By Coverage

`POST /api/v1/admin/saved-searches/overlaps`

Returns active (`Waiting`), non-deleted saved searches whose canonical coverage
intersects the supplied search area. This is an owner/admin endpoint because the
result crosses user ownership boundaries and contains private search intent.

## Request

The `geoSearch` input uses the same validated modes as saved-search creation:

```json
{
  "geoSearch": {
    "mode": "area",
    "bounds": {
      "northEast": { "lat": 13.78, "lng": 100.66 },
      "southWest": { "lat": 13.75, "lng": 100.62 }
    }
  },
  "page": 1,
  "limit": 20
}
```

- `area` converts bounds to a polygon.
- `nearby` buffers `position` by `radiusMeters`.
- `line` buffers a `LineString` or `MultiLineString` by `distanceMeters`.

All derived geometry uses GeoJSON coordinate order: longitude, then latitude.
Clients cannot submit or override the stored `coverage` field.

## Query contract

The database query always includes:

```js
{
  status: "Waiting",
  isDeleted: false,
  "geoSearch.coverage": {
    $geoIntersects: { $geometry: normalizedInputCoverage }
  }
}
```

Results are sorted by `createdAt` descending and `_id` ascending, then paginated.
The partial `active_saved_search_coverage_2dsphere` index contains only active,
non-deleted documents.

## Deployment

1. Deploy code containing the coverage schema and write-path derivation.
2. Run `npm run db:migrate` to backfill existing `client_requests` documents.
3. Run the normal database index creation/audit workflow.
4. Enable callers of the overlap endpoint only after migration and index checks
   pass.

The backfill is batched, idempotent, and never replaces existing coverage.
