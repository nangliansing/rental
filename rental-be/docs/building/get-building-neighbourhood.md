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
| 1 | `public_transport` | Public Transport | OpenStreetMap + static enrichment |
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

Places are sorted by ascending `distanceMeters`, then name. POIs without a usable
name fall back to `Unnamed place`.

| Limit | Value | Applies to |
| --- | ---: | --- |
| Dense POI caps | convenience 15, restaurant 20, café 15 | Non-transit categories listed |
| Bus stop cap | 20 nearest | `highway=bus_stop` and equivalent platform nodes (after 50 m dedupe) |
| Global backstop | 200 | Non-transit places after category caps |
| Transit | uncapped | Rail, monorail, ferry, and bus stations within radius |

`summary.all` counts every place returned in `places`, including public transport.
Because transit is uncapped, `summary.all` may exceed **200** when many stations
or bus stops are within radius.

When any cap applies, the response exposes truncation metadata:

- `summary.truncated` — `true` when any category cap or global backstop applied
- `summary.totalWithinRadius` — count of valid places within `radiusM` **before** caps (only present when greater than `summary.all`)
- `categories[].truncated` — `true` when that tab hit its cap (including `public_transport` when bus stops were capped)

## Data Sources

### OpenStreetMap / Overpass

On cache miss, the backend sends **one Overpass query** for all OSM-backed
categories within `fetchRadiusM`. Large venues (malls, markets, supermarkets,
hospitals, gyms) are fetched as both **nodes and ways**; ways use Overpass
`out center` so area-mapped POIs resolve to a centroid.

Examples of mapped tags:

| Category | OSM tags |
| --- | --- |
| Public Transport | BTS/MRT/SRT/ARL/monorail stations, ferry terminals, nearest bus stops, bus stations |
| Convenience Stores | `shop=convenience` |
| Supermarkets | `shop=supermarket`, `shop=department_store`, `shop=wholesale` |
| Restaurants | `amenity=restaurant`, `amenity=fast_food` |
| Cafés | `amenity=cafe` |
| Pharmacies | `amenity=pharmacy` |
| Markets | `amenity=marketplace` |
| Shopping Malls | `shop=mall` |
| Gyms | `leisure=fitness_centre` |
| Hospitals | `amenity=hospital`, `amenity=clinic` |

Overpass is called **server-side only**. Never call it from the browser.

### Static public transport enrichment

A curated BTS/MRT station list lives at:

```txt
modules/neighbourhood/data/public-transport.stations.json
```

This list is merged on every response to:

- enrich OSM stations with reliable `mode` and `line` metadata
- deduplicate nearby OSM/static duplicates (within 150 m)
- provide fallback transit results when Overpass is unavailable

OpenStreetMap is the primary source for transit coverage. The static list no
longer limits which areas can return public transport.

### Bus stops

Bangkok has dense bus-stop coverage in OpenStreetMap. To keep the map readable:

- **All** rail/monorail and ferry results within radius are returned.
- **All** `amenity=bus_station` results within radius are returned.
- **Nearest 20** `highway=bus_stop` (and equivalent platform) results are returned after 50 m dedupe.

When more bus stops exist within radius, `categories[].truncated` is `true` for
`public_transport` and the UI should show counts like `20+` for that tab.

Bus places include optional `mode: "bus"`, optional `transitRole`
(`bus_stop` or `bus_station`), and may include a route/operator label in `line`.

### Dense POI caps

Some categories are much denser than others in Bangkok. After radius filtering, the API applies **per-category caps** for walkability summaries:

| Category | Cap |
| --- | ---: |
| Convenience | 15 |
| Restaurants | 20 |
| Cafés | 15 |

Sparse categories (supermarket, pharmacy, market, mall, gym, hospital) remain uncapped within radius. A global backstop of **200 non-transit places** still applies after category caps.

When a dense category hits its cap, `categories[].truncated` is `true` and the UI
should show counts like `15+`. Response `summary.truncated` and
`summary.totalWithinRadius` indicate overall truncation.

### Defensive processing

Before distance filtering and caching, the backend validates and normalizes data:

- Building coordinates must be valid GeoJSON `[lng, lat]`; invalid locations return `422`.
- Cached or merged places are sanitized: entries with missing ids, unknown
  categories, or invalid coordinates are dropped silently rather than failing the
  request.
- Overpass responses ignore elements without usable coordinates or supported tags.
- Nearby node/way duplicates for the same POI are collapsed server-side (75 m for
  named places, 25 m for unnamed).
- When Overpass fails with no cache to reuse, the endpoint returns static transit
  only (`cacheStatus: bypass`) and does **not** write an empty/poisoned cache entry.

## Caching

Neighbourhood POIs are cached in MongoDB collection `neighbourhood_caches`.

| Setting | Value |
| --- | --- |
| Cache key | rounded origin lat/lng to 3 decimals + `fetchRadiusM` + cache version (`v5`) |
| Default TTL | 14 days |
| Shared entries | nearby buildings with the same rounded origin reuse cache |

Bump `NEIGHBOURHOOD_CACHE_VERSION` in `neighbourhood.constants.js` when Overpass
query rules or POI normalization change so deploys miss old cache entries
automatically. Legacy keys without a version suffix are ignored after a bump.

`cacheStatus` values:

| Value | Meaning |
| --- | --- |
| `miss` | Fresh Overpass fetch populated the cache |
| `hit` | Valid cache entry was reused |
| `bypass` | Overpass disabled, Overpass failed without a cache entry to reuse, or static transit only |
| `stale` | Overpass failed; expired cache entry was reused |

If Overpass fails and no valid or stale cache exists, the endpoint still returns
static transit places when available instead of failing the whole request. Those
transit-only responses are **not** written to Mongo cache, so the next request
can retry Overpass.

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
      "all": 112,
      "truncated": true,
      "totalWithinRadius": 200,
      "public_transport": 33,
      "convenience": 15,
      "supermarket": 11,
      "restaurant": 20,
      "cafe": 15,
      "pharmacy": 3,
      "market": 2,
      "shopping_mall": 4,
      "gym": 4,
      "hospital": 5
    },
    "categories": [
      {
        "key": "public_transport",
        "label": "Public Transport",
        "priority": 1,
        "count": 33,
        "truncated": true
      },
      {
        "key": "convenience",
        "label": "Convenience Stores",
        "priority": 2,
        "count": 15,
        "truncated": true
      },
      {
        "key": "supermarket",
        "label": "Supermarkets",
        "priority": 3,
        "count": 11
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
        "id": "osm-way-316166705",
        "name": "ตะวันนาบางกะปิ",
        "lat": 13.76463,
        "lng": 100.6417,
        "category": "market",
        "distanceMeters": 171
      },
      {
        "id": "mrt-bang-kapi",
        "name": "MRT Bang Kapi",
        "lat": 13.7692,
        "lng": 100.6396,
        "category": "public_transport",
        "mode": "mrt",
        "line": "Blue Line",
        "distanceMeters": 420
      },
      {
        "id": "osm-node-501",
        "name": "Bus stop 142",
        "lat": 13.764,
        "lng": 100.641,
        "category": "public_transport",
        "mode": "bus",
        "transitRole": "bus_stop",
        "distanceMeters": 180
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
| `cacheStatus` | `hit`, `miss`, `stale`, or `bypass` |
| `source` | Always `openstreetmap` for v1 |
| `summary.all` | Number of places returned in `places` |
| `summary.truncated` | Present when any cap or backstop applied |
| `summary.totalWithinRadius` | Pre-cap count within radius (when truncated) |
| `categories` | Tab metadata; zero-count categories omitted |
| `categories[].truncated` | Present when that category hit its cap |
| `places[].id` | Stable POI id (`osm-...` or static station id) |
| `places[].distanceMeters` | Straight-line distance from the building |

Public transport entries may include optional `mode`, `line`, and `transitRole`
(`bus_stop`, `bus_station`, or omitted for rail/ferry).

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
- Malls mapped with non-standard tags (for example ferry piers named after a
  mall) may still be missing until OSM tagging improves or a curated anchor is
  added.
- Nearby node/way duplicates for the same POI are collapsed server-side (see
  **Defensive processing** above).

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
capPlacesByCategory
loadStaticTransitPlaces
normalizeOverpassResponse
queryOverpass
```

Shared neighbourhood utilities:

```txt
modules/neighbourhood/services/neighbourhood-place.utils.js
  sortPlacesByDistanceThenName
  sanitizeNeighbourhoodPlaces
  validateNeighbourhoodOrigin
  attachDistanceMeters
  resolveOsmPlaceName
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
test/neighbourhood.test.js                      # unit (55 tests)
test/neighbourhood.integration.test.js          # service + Mongo (13 tests)
test/neighbourhood.scenarios.integration.test.js # HTTP scenario matrix (21 tests)
test/app.integration.test.js                    # HTTP boundary (3 tests)
```

Run neighbourhood tests only (from the `rental-be` repository root):

```bash
node --test \
  test/neighbourhood.test.js \
  test/neighbourhood.integration.test.js \
  test/neighbourhood.scenarios.integration.test.js
```

Run the full backend suite:

```bash
npm test
```

Expected neighbourhood result: **87 pass, 0 fail**.

## Tested Checklist

Backend automated coverage (2026-07-28):

```txt
params validation (bounds, non-numeric, radiusM <= fetchRadiusM)
OSM classification, ways, node/way dedupe, bus stop enrichment
summary tab ordering, zero-count exclusion, truncation flags
radius filtering, dense POI caps, bus stop cap, 200-place backstop
cache hit/miss/stale/bypass behaviour
no cache write when Overpass fails without data
static transit merge and dedupe
invalid cached places sanitized without failing request
building coordinate validation
HTTP success, validation, cache, truncation, and defensive scenarios
```

Scenario matrix (`test/neighbourhood.scenarios.integration.test.js`):

```txt
Validation   invalid id, 404 missing/inactive, radius bounds, non-numeric params
Success      defaults, min/max radius, no auth, empty remote location
Cache        hit on second request, shared rounded origin, seeded OSM cache
Truncation   convenience cap, bus stop cap + public_transport truncated,
             global 200 non-transit backstop, invalid cache entries ignored
```

Local smoke (2026-07-28, building `6a595fd9e0608be2e4255f63`):

```txt
GET defaults                           -> 200, cacheStatus=hit
GET radiusM=500&fetchRadiusM=2000      -> 200, fewer places than 2000m
GET radiusM=2000&fetchRadiusM=2000     -> 200, summary.all=112, truncated=true
GET missing building                   -> 404 BUILDING_NOT_FOUND
GET invalid buildingId                 -> 422 VALIDATION_ERROR
GET radiusM=499                        -> 422 min 500
GET radiusM=1500&fetchRadiusM=1000    -> 422 radiusM <= fetchRadiusM
GET radiusM=2001                       -> 422 max 2000
GET fetchRadiusM=2001                  -> 422 max 2000
GET radiusM=abc                        -> 422 non-numeric

Verified live:
  Tawanna market present (ตะวันนาบางกะปิ)
  bus stops capped at 20, rail uncapped
  dense caps: convenience 15, restaurant 20, cafe 15
  categories[].truncated set for capped tabs
```

Sample requests:

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
- OSM coverage is good in Bangkok but not guaranteed complete; names may be
  missing, Thai-only, or outdated
- Malls mapped with non-standard tags (for example ferry piers named after a
  mall) may still be missing until OSM tagging improves
- Static BTS/MRT enrichment improves rail metadata but does not limit OSM transit
  coverage; bus stops come from OpenStreetMap
- Overpass availability can vary; stale cache is used when possible, otherwise
  static transit only (`cacheStatus: bypass`)
