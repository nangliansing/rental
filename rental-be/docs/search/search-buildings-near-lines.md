# Search Buildings Near Lines

Search active buildings whose point location is within a requested distance of
a GeoJSON line or set of lines. The endpoint supports both a single route and
multiple connected or disconnected route segments.

Nested listings include `availableAt`. See [`../listing/available-at-response.md`](../listing/available-at-response.md).

Date search filter: `availableBy`. See [`../listing/available-by-filter.md`](../listing/available-by-filter.md).

## Endpoint

```http
POST /api/v1/search/buildings/near-lines
```

Local development URL:

```http
POST http://localhost:3000/api/v1/search/buildings/near-lines
```

The route uses the public search rate limiter. Authentication is optional.

## Headers

Required:

```http
Content-Type: application/json
```

Optional:

```http
Authorization: Bearer ACCESS_TOKEN
```

Never send a Supabase service-role key to this endpoint or expose one in the
frontend.

## Optional Authentication

Authentication changes viewer-specific fields only. It does not change which public buildings or listings are searchable.

| Token or user state | Result |
| --- | --- |
| No token | Continue anonymously |
| Invalid or expired access token | Continue anonymously |
| Valid token for an `ACTIVE` user | Populate viewer-specific follow and saved state |
| Valid token for a suspended, inactive, deleted, or missing user | Continue anonymously |

For an anonymous viewer:

- every returned building has `"isFollowing": false`
- every returned listing has `"isSavedByMe": false`

## Geometry

The frontend must send valid GeoJSON using `[longitude, latitude]` coordinate
order. Longitude is between `-180` and `180`; latitude is between `-90` and
`90`. Altitude or other third coordinate values are not accepted.

### One line (`LineString`)

```json
{
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [100.5018, 13.7563],
      [100.5118, 13.7501],
      [100.5231, 13.7367]
    ]
  },
  "distanceMeters": 500,
  "page": 1,
  "limit": 20
}
```

### Multiple lines (`MultiLineString`)

Connected lines may share the last position of one line with the first
position of the next line. The endpoint also accepts disconnected lines.

```json
{
  "geometry": {
    "type": "MultiLineString",
    "coordinates": [
      [
        [100.5018, 13.7563],
        [100.5118, 13.7501],
        [100.5231, 13.7367]
      ],
      [
        [100.5231, 13.7367],
        [100.5304, 13.7452]
      ]
    ]
  },
  "distanceMeters": 500,
  "page": 1,
  "limit": 20
}
```

Overlapping line buffers do not duplicate buildings in the response.

### Geometry constraints

| Rule | Constraint |
| --- | --- |
| Supported type | `LineString` or `MultiLineString` |
| Geometry properties | Exactly `type` and `coordinates` |
| Positions per line | At least 2 |
| Distinct positions per line | At least 2 |
| Lines in a `MultiLineString` | 1–100 |
| Total positions | At most 1000 |
| Position shape | Exactly `[longitude, latitude]` |

## Request fields

| Field | Type | Required | Default | Rules |
| --- | --- | --- | --- | --- |
| `geometry` | GeoJSON object | Yes | — | See geometry constraints above |
| `distanceMeters` | integer | No | `500` | `1`–`2000`, inclusive |
| `page` | integer or numeric string | No | `1` | `1`–`10000`, inclusive |
| `limit` | integer or numeric string | No | `20` | `1`–`100`, inclusive |
| `includeBuildingsWithoutMatchingListings` | boolean | No | `false` | Must be a JSON boolean |

`distanceMeters` is the radius around every segment of every supplied line.
A building is matched when its GeoJSON point falls inside the resulting
buffered area.

## Optional filters

The endpoint reuses the same filters as
`POST /api/v1/search/buildings/map`.

```json
{
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [100.64, 13.765],
      [100.65, 13.768]
    ]
  },
  "distanceMeters": 500,
  "minRent": 10000,
  "maxRent": 20000,
  "buildingType": "Condo",
  "buildingFacilities": ["Parking", "Gym"],
  "security": ["Security Guard"],
  "listingFacilities": ["Air Conditioner", "Washing Machine"],
  "kitchenType": "Kitchen",
  "contractMonths": 6,
  "occupancy": 2,
  "bedroomCount": 1,
  "bathroomCount": 1,
  "isForeignerAccepted": true,
  "isTM30Provided": true,
  "isCookingAllowed": true,
  "isPetAllowed": true,
  "availableBy": "2026-08-15",
  "supportLanguages": ["English", "Thai"],
  "agentProfileIds": ["6a5669f81a9630e315e059a7"],
  "includeBuildingsWithoutMatchingListings": false,
  "page": 1,
  "limit": 20
}
```

Filter behavior:

- `buildingFacilities`, `security`, and `listingFacilities` require all
  requested values to match.
- `supportLanguages` uses OR matching.
- `kitchenType: "Kitchen"` also matches `"Separate Kitchen"`.
- `contractMonths` matches listings whose contract duration is less than or
  equal to the requested value.
- `occupancy` matches listings whose capacity is greater than or equal to the
  requested value.
- `bedroomCount: 0` matches exactly zero bedrooms.
- `bedroomCount` greater than zero matches that number or more.
- `availableBy` keeps Flexible listings and listings available on or before
  that Thailand date. See
  [`../listing/available-by-filter.md`](../listing/available-by-filter.md).
- Boolean filters must be JSON booleans, not strings such as `"true"`.
- `maxRent` must be greater than or equal to `minRent` when both are supplied.
- `listerIds` is accepted as a legacy alias for `agentProfileIds`. Do not send
  both fields in one request.
- Enum and facility values must use the exact values supported by the building,
  listing, and agent schemas.

## Listing and building availability

By default, a result is returned only when:

- the building point is inside the buffered line geometry;
- the building is active;
- the building matches all building filters;
- it has at least one listing matching all listing and agent filters;
- the listing is public and not deleted;
- the lister has a non-deleted agent profile; and
- the lister user exists and is active.

With `"includeBuildingsWithoutMatchingListings": true`, an active building
inside the buffered geometry can be returned with `"listings": []`. Building
filters still apply. This option does not make inactive buildings eligible.

Agent verification and online status are display information and do not hide
otherwise eligible public listings.

## Success response

Status:

```http
200 OK
```

```json
{
  "success": true,
  "data": [
    {
      "_id": "6a595fd9e0608be2e4255f64",
      "name": "Example Building",
      "address": "Lat Phrao Road, Bang Kapi, Bangkok",
      "buildingType": "Condo",
      "facilities": ["Parking", "Gym"],
      "security": ["Security Guard"],
      "location": {
        "type": "Point",
        "coordinates": [100.642, 13.7656]
      },
      "minRent": 14500,
      "maxRent": 22000,
      "isFollowing": false,
      "listings": [
        {
          "_id": "6a596137e24814847ca9713c",
          "visibility": "PUBLIC",
          "rent": 18000,
          "bedroomCount": 1,
          "bathroomCount": 1,
          "kitchenType": "Kitchen",
          "availableAt": null,
          "isSavedByMe": false
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

`pagination.total` is the number of matching buildings before page slicing.
Requesting a page beyond the available results returns `200` with an empty
`data` array and preserves the total.

## Error format

Error responses include a server-generated `requestId` for tracing:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "distanceMeters must be between 1 and 1000",
  "requestId": "3c48f443-215a-44f2-abe7-99a1a8ae582c"
}
```

Common errors:

| Status | Code | Example message |
| --- | --- | --- |
| `400` | `INVALID_JSON` | `Request body must be valid JSON` |
| `422` | `VALIDATION_ERROR` | `body must be an object` |
| `422` | `VALIDATION_ERROR` | `geometry must be an object` |
| `422` | `VALIDATION_ERROR` | `geometry.type must be LineString or MultiLineString` |
| `422` | `VALIDATION_ERROR` | `geometry must contain exactly: type, coordinates` |
| `422` | `VALIDATION_ERROR` | `geometry.coordinates must contain at least two positions` |
| `422` | `VALIDATION_ERROR` | `geometry.coordinates must contain at least two distinct positions` |
| `422` | `VALIDATION_ERROR` | `geometry.coordinates cannot contain more than 100 lines` |
| `422` | `VALIDATION_ERROR` | `geometry cannot contain more than 1000 positions` |
| `422` | `VALIDATION_ERROR` | `distanceMeters must be an integer` |
| `422` | `VALIDATION_ERROR` | `distanceMeters must be between 1 and 1000` |
| `422` | `VALIDATION_ERROR` | `page must be between 1 and 10000` |
| `422` | `VALIDATION_ERROR` | `limit must be between 1 and 100` |
| `422` | `VALIDATION_ERROR` | `includeBuildingsWithoutMatchingListings must be a boolean` |
| `429` | `RATE_LIMIT_EXCEEDED` | `Too many requests. Please try again later.` |

An invalid optional bearer token does not produce an authentication error; the
request continues anonymously.

## Frontend integration example

```js
const searchBuildingsNearLines = async ({
  lines,
  distanceMeters = 500,
  filters = {},
  page = 1,
  limit = 20,
  accessToken,
}) => {
  const geometry =
    lines.length === 1
      ? { type: "LineString", coordinates: lines[0] }
      : { type: "MultiLineString", coordinates: lines };

  const response = await fetch("/api/v1/search/buildings/near-lines", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {}),
    },
    body: JSON.stringify({
      geometry,
      distanceMeters,
      ...filters,
      page,
      limit,
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message ?? "Unable to search buildings");
  }

  return payload;
};
```

The frontend should convert any map-library coordinate objects into plain
`[longitude, latitude]` arrays before calling the endpoint. Do not reverse the
coordinate order.

## isFollowing

Each returned building includes `isFollowing`.

- anonymous viewer: `false`
- invalid token: `false`
- suspended/inactive/missing viewer user: `false`
- active viewer who follows the building: `true`
- active viewer who does not follow the building: `false`

The follow lookup runs after pagination so only buildings on the requested page are enriched.

## isSavedByMe

Each returned listing includes `isSavedByMe` using the same anonymous-viewer rules as above.

## Implementation notes

- The line geometry is buffered by `distanceMeters` before querying MongoDB.
- Buildings are matched through the existing `location` `2dsphere` index.
- The endpoint reuses the map search's filtering, listing population,
  projection, deterministic ordering, saved-state enrichment, follow-state
  enrichment, and pagination pipeline.

Automated coverage:

```txt
test/search-buildings-near-lines.integration.test.js
test/building-is-following.integration.test.js
```

Before deploying to a new environment, audit its physical indexes and verify
the near-lines execution plan with that environment's `MONGODB_URI`:

```bash
npm run db:indexes:audit
npm run db:indexes:explain:near-lines
```

Both commands are read-only. The explain command exits unsuccessfully when
MongoDB does not select the building location geospatial index.
