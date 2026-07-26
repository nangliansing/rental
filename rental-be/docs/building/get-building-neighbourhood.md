# Get Building Neighbourhood

Return nearby points of interest around an active building for the
**Explore neighbourhood** feature.

The endpoint answers: *what is within a chosen radius of this building?* It
returns straight-line distances in meters, category counts for scrollable tabs,
and a flat place list that the frontend can filter locally by category.

Data comes from **OpenStreetMap (Overpass API)** plus a small static BTS/MRT
station list maintained by the backend. Walking paths and walking durations are
**not** included.

## Endpoint

```http
GET /api/v1/buildings/:buildingId/neighbourhood
```

Local development URL:

```http
GET http://localhost:3000/api/v1/buildings/6a595fd9e0608be2e4255f63/neighbourhood
```

Production URL (after deployment):

```http
GET https://rental-be.fly.dev/api/v1/buildings/6a595fd9e0608be2e4255f63/neighbourhood
```

The route uses the public read rate limiter. Authentication is optional and
does not change the response.

## Auth

No access token is required.

Inactive buildings are hidden from the public endpoint and return the same
response as missing buildings.

## Path Params

```txt
buildingId  required, valid Mongo ObjectId
```

## Query Params

| Param | Type | Required | Default | Rules |
| --- | --- | --- | --- | --- |
| `radiusM` | integer | no | `1000` | Visible radius in meters. Min `500`, max `2000`. Must be `<= fetchRadiusM`. |
| `fetchRadiusM` | integer | no | `2000` | Fetch/cache radius in meters. Min `1`, max `2000`. |

Query-string numbers are accepted (`radiusM=1000`).

### Radius behaviour

- The backend fetches POIs once up to `fetchRadiusM` and caches them.
- The response filters cached POIs down to `radiusM`.
- Shrinking `radiusM` on later requests does **not** call Overpass again when
  the cache entry for the same rounded origin + `fetchRadiusM` is still valid.
- Expanding `radiusM` beyond a previous request only reveals more cached POIs
  until `fetchRadiusM` is reached.

Example:

```http
GET /api/v1/buildings/6a595fd9e0608be2e4255f63/neighbourhood?radiusM=500&fetchRadiusM=2000
```

## Business Rules

The building must:

- exist
- have `isActive: true`

Missing and inactive buildings both return:

```json
{
  "success": false,
  "code": "BUILDING_NOT_FOUND",
  "message": "Building not found"
}
```

### Distance model

- Distances are **straight-line** (`haversine`) meters from the building origin.
- They are **not** walking times or routed path lengths.
- The UI should label results as `350 m away`, not `5 min walk`.

### Category tabs

Supported categories, in importance order:

| Priority | Key | Label | Source |
| ---: | --- | --- | --- |
| 1 | `public_transport` | Public Transport | Static BTS/MRT station list |
| 2 | `convenience` | Convenience Stores | OpenStreetMap |
| 3 | `supermarket` | Supermarkets | OpenStreetMap |
| 4 | `restaurant` | Restaurants | OpenStreetMap |
| 5 | `cafe` | Cafés | OpenStreetMap |
| 6 | `pharmacy` | Pharmacies | OpenStreetMap |
| 7 | `market` | Markets | OpenStreetMap |
| 8 | `shopping_mall` | Shopping Malls | OpenStreetMap |
| 9 | `gym` | Gyms | OpenStreetMap |
| 10 | `hospital` | Hospitals | OpenStreetMap |

Rules:

- `summary` includes counts for every category, including zeros.
- `categories` includes **only categories with `count > 0`**, sorted by
  `priority`.
- The frontend should filter `places` locally when the user selects a tab.
- No second API call is required per tab.

### Result limits

- At most **200** places are returned in `places`.
- Places are sorted by ascending `distanceMeters`, then name.
- POIs without a usable name fall back to `Unnamed place`.

## Data Sources

### OpenStreetMap / Overpass

On cache miss, the backend sends **one Overpass query** for all OSM-backed
categories within `fetchRadiusM`.

Examples of mapped tags:

| Category | OSM tags |
| --- | --- |
| Convenience Stores | `shop=convenience` |
| Supermarkets | `shop=supermarket` |
| Restaurants | `amenity=restaurant`, `amenity=fast_food` |
| Cafés | `amenity=cafe` |
| Pharmacies | `amenity=pharmacy` |
| Markets | `amenity=marketplace` |
| Shopping Malls | `shop=mall` |
| Gyms | `leisure=fitness_centre` |
| Hospitals | `amenity=hospital`, `amenity=clinic` |

Overpass is called **server-side only**. Never call it from the browser.

### Static public transport

BTS/MRT stations are loaded from:

```txt
modules/neighbourhood/data/public-transport.stations.json
```

Static stations are merged on every response so transit data stays available
even on cache hits.

If no static station falls within `fetchRadiusM`, `public_transport` count
remains `0` and the tab is omitted.

## Caching

Neighbourhood POIs are cached in MongoDB collection `neighbourhood_caches`.

| Setting | Value |
| --- | --- |
| Cache key | rounded origin lat/lng to 3 decimals + `fetchRadiusM` |
| Default TTL | 14 days |
| Shared entries | nearby buildings with the same rounded origin reuse cache |

`cacheStatus` values:

| Value | Meaning |
| --- | --- |
| `miss` | Fresh Overpass fetch populated the cache |
| `hit` | Valid cache entry was reused |
| `bypass` | Overpass disabled; static transit only or test mode |
| `stale` | Overpass failed; expired cache entry was reused |

If Overpass fails and no stale cache exists, the endpoint still returns static
transit places when available instead of failing the whole request.

## Response Shape

Status:

```http
200 OK
```

Body:

```json
{
  "success": true,
  "data": {
    "buildingId": "6a595fd9e0608be2e4255f63",
    "origin": {
      "lat": 13.765,
      "lng": 100.641
    },
    "radiusMeters": 1000,
    "fetchRadiusMeters": 2000,
    "fetchedAt": "2026-07-26T19:17:15.805Z",
    "cacheStatus": "hit",
    "source": "openstreetmap",
    "summary": {
      "all": 35,
      "public_transport": 0,
      "convenience": 11,
      "supermarket": 1,
      "restaurant": 10,
      "cafe": 11,
      "pharmacy": 0,
      "market": 0,
      "shopping_mall": 0,
      "gym": 0,
      "hospital": 2
    },
    "categories": [
      {
        "key": "convenience",
        "label": "Convenience Stores",
        "priority": 2,
        "count": 11
      },
      {
        "key": "supermarket",
        "label": "Supermarkets",
        "priority": 3,
        "count": 1
      }
    ],
    "places": [
      {
        "id": "osm-node-13987430103",
        "name": "7-Eleven",
        "lat": 13.761819,
        "lng": 100.640989,
        "category": "convenience",
        "distanceMeters": 354
      },
      {
        "id": "bts-bang-chak",
        "name": "BTS Bang Chak",
        "lat": 13.6963,
        "lng": 100.6051,
        "category": "public_transport",
        "mode": "bts",
        "line": "Sukhumvit Line",
        "distanceMeters": 8200
      }
    ]
  }
}
```

Field notes:

| Field | Description |
| --- | --- |
| `origin` | Building location as `{ lat, lng }` |
| `radiusMeters` | User-visible filter radius |
| `fetchRadiusMeters` | Cached fetch radius |
| `fetchedAt` | ISO timestamp for the cached POI set |
| `source` | Always `openstreetmap` for v1 |
| `summary.all` | Number of places within `radiusMeters` |
| `categories` | Tab metadata; zero-count categories omitted |
| `places[].id` | Stable POI id (`osm-...` or static station id) |
| `places[].distanceMeters` | Straight-line distance from the building |

Public transport entries may include optional `mode` and `line`.

## Error Cases

### Invalid Building Id

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "buildingId must be a valid id"
}
```

### Building Not Found

```http
404 Not Found
```

```json
{
  "success": false,
  "code": "BUILDING_NOT_FOUND",
  "message": "Building not found"
}
```

This also applies when the building exists but is inactive.

### Radius Too Small

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "radiusM must be at least 500"
}
```

### Radius Above Maximum

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "radiusM must be between 1 and 2000"
}
```

### radiusM Greater Than fetchRadiusM

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "radiusM must be less than or equal to fetchRadiusM"
}
```

## Environment Variables

Optional neighbourhood settings:

| Variable | Default | Notes |
| --- | --- | --- |
| `NEIGHBOURHOOD_OVERPASS_ENABLED` | `true` in development/production, `false` in test | Disable to serve static transit only |
| `OVERPASS_API_URL` | `https://overpass-api.de/api/interpreter` | Overpass interpreter endpoint |
| `NEIGHBOURHOOD_CACHE_TTL_DAYS` | `14` | Mongo TTL for cached POI entries, 1–90 days |

See `.env.example` for local setup.

## Frontend Integration Notes

Recommended client flow:

1. Load neighbourhood data once per building using default
   `radiusM=1000&fetchRadiusM=2000`.
2. Render horizontal category tabs from `data.categories`.
3. Filter `data.places` locally when the user selects a tab.
4. Adjust the radius slider client-side against cached data until the user
   exceeds `fetchRadiusM`; then call the endpoint again with a larger
   `fetchRadiusM`.
5. Draw map pins from filtered places.
6. Display straight-line distance labels such as `350 m away`.

Do **not** request a new API call per tab.

## Cost And Operational Notes

- OpenStreetMap Overpass is free, but rate-limited.
- Cost control comes from backend-only calls plus Mongo caching.
- Typical usage should stay near zero marginal cost at early scale.
- OpenStreetMap coverage is good in Bangkok but not guaranteed complete.
- New shops may appear in OSM after a delay.

Attribution requirement for map UIs using OSM-derived POIs:

```txt
© OpenStreetMap contributors
```

## Implementation Notes

Main module:

```txt
modules/neighbourhood/
```

Route registration:

```txt
GET /:buildingId/neighbourhood
modules/building/building.routes.js
```

Important services:

```txt
getBuildingNeighbourhoodService
resolveNeighbourhoodPlaces
buildNeighbourhoodSummary
filterPlacesByRadius
loadStaticTransitPlaces
queryOverpass
```

Shared geo helpers:

```txt
shared/geo/haversine-distance-meters.js
shared/geo/round-coordinate.js
shared/geo/to-lat-lng.js
```

Mongo model:

```txt
NeighbourhoodCache -> collection neighbourhood_caches
TTL index on expiresAt
```

Automated tests:

```txt
test/neighbourhood.test.js
test/neighbourhood.integration.test.js
test/app.integration.test.js  # HTTP boundary
```

Run:

```bash
npm test
```

## Tested Checklist

Backend automated coverage:

```txt
params validation
OSM classification and normalization
summary tab ordering and zero-count exclusion
radius filtering and 200-place cap
cache hit/miss/stale behaviour
static transit merge
HTTP success and error boundaries
```

Postman manual smoke (2026-07-27, local):

```txt
GET defaults -> 200, summary.all=35
GET radiusM=500 -> 200, summary.all=12
GET missing building -> 404 BUILDING_NOT_FOUND
GET invalid buildingId -> 422 VALIDATION_ERROR
GET radiusM=499 -> 422 min 500
GET radiusM=1500&fetchRadiusM=1000 -> 422 radiusM <= fetchRadiusM
GET radiusM=2000&fetchRadiusM=2000 -> 200, summary.all=107
GET radiusM=2001 -> 422 max 2000
GET second building 6a595fd9e0608be2e4255f64 -> 200, cacheStatus=miss
```

Sample Postman requests:

```http
GET http://localhost:3000/api/v1/buildings/6a595fd9e0608be2e4255f63/neighbourhood
GET http://localhost:3000/api/v1/buildings/6a595fd9e0608be2e4255f63/neighbourhood?radiusM=500&fetchRadiusM=2000
GET http://localhost:3000/api/v1/buildings/6790f1f2f1d2c3b4a5e6d7c8/neighbourhood
GET http://localhost:3000/api/v1/buildings/not-a-valid-id/neighbourhood
GET http://localhost:3000/api/v1/buildings/6a595fd9e0608be2e4255f64/neighbourhood?radiusM=1000&fetchRadiusM=2000
```

## Known Limitations (v1)

- No walking routes or walking durations
- No Google Places enrichment
- Public transport coverage depends on the static station list
- Buildings far from listed BTS/MRT stations may show no transit tab
- OSM names may be missing, Thai-only, or outdated
- Overpass availability can vary; stale cache is used when possible
