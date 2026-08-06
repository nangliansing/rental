# Create Saved Search

Save a client's rental search request for the authenticated user.

A saved search stores:

- a human-readable name and optional description
- a geo search (`area`, `nearby`, or `line`)
- the same listing/building/agent filters used by map search

This endpoint is authenticated. Only an active user can create a saved search.

## Endpoint

```http
POST /api/v1/saved-searches
```

Full local URL:

```http
POST http://localhost:3000/api/v1/saved-searches
```

## Auth

Requires an active user access token.

```http
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

The route uses:

```txt
authenticate
requireActiveUser
```

Suspended, inactive, deleted, or missing users cannot access this endpoint.

Do not send `createdBy` in the body. The backend always uses `req.currentUser._id`.

## Request Body

```json
{
  "name": "Sukhumvit 2BR",
  "description": "Client wants condo near BTS Phrom Phong.",
  "geoSearch": {
    "mode": "area",
    "bounds": {
      "northEast": { "lat": 13.77755, "lng": 100.65739 },
      "southWest": { "lat": 13.75304, "lng": 100.62661 }
    },
    "placeName": "Phrom Phong"
  },
  "filters": {
    "minRent": 15000,
    "maxRent": 35000,
    "bedroomCount": 2,
    "buildingType": "Condo",
    "isForeignerAccepted": true,
    "agentProfileIds": ["6a5669f81a9630e315e059a7"]
  }
}
```

Fields:

```txt
name         required, string, 1..120 characters after trim
description  optional, string, max 2000 characters after trim
geoSearch    required, object, mode-specific geo payload
filters      optional, object, map-search filter fields
```

Empty or whitespace-only `description` / `placeName` values are normalized to `null`.

Omitted `filters` is treated as `{}`.

### Status

`status` is not accepted from the client on create.

New records are always created with:

```json
{
  "status": "Waiting"
}
```

Allowed status values in the model:

```txt
Waiting
Closed
```

### Geo Search

`geoSearch.mode` is required and must be one of:

```txt
area
nearby
line
```

#### Area

```json
{
  "mode": "area",
  "bounds": {
    "northEast": { "lat": 13.78, "lng": 100.66 },
    "southWest": { "lat": 13.75, "lng": 100.62 }
  },
  "placeName": "Phrom Phong"
}
```

Rules:

```txt
bounds                 required
bounds.northEast.lat   > bounds.southWest.lat
bounds.northEast.lng   > bounds.southWest.lng
placeName              optional, string, max 200 characters
```

Unused nearby/line fields are ignored and not stored.

#### Nearby

```json
{
  "mode": "nearby",
  "position": { "lat": 13.7308, "lng": 100.5418 },
  "radiusMeters": 500,
  "placeName": "Siam"
}
```

Rules:

```txt
position       required, { lat: -90..90, lng: -180..180 }
radiusMeters   required, integer, 1..2000
placeName      optional, string, max 200 characters
```

#### Line

```json
{
  "mode": "line",
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [100.6, 13.7],
      [100.7, 13.8]
    ]
  },
  "distanceMeters": 750
}
```

Rules:

```txt
geometry         required, LineString or MultiLineString
coordinates      GeoJSON order [lng, lat]
distanceMeters   required, integer, 1..2000
placeName        optional, string, max 200 characters
```

### Filters

`filters` reuses the same field rules as map search (`POST /api/v1/search/buildings/map`).

Optional filter fields:

```txt
minRent
maxRent
buildingType
buildingFacilities
security
listingFacilities
bedroomCount
bathroomCount
kitchenType
contractMonths
occupancy
isForeignerAccepted
isTM30Provided
isCookingAllowed
isPetAllowed
availableBy
supportLanguages
agentProfileIds
```

Notes:

- `maxRent` must be greater than or equal to `minRent` when both are provided
- use either `agentProfileIds` or legacy `listerIds`, not both
- `listerIds` is normalized to `agentProfileIds`
- empty optional arrays are omitted from the validated create payload

These filters are intended to be spread into a later search request together with the stored geo fields.

## Business Rules

- Backend always sets `createdBy` from the authenticated user
- Backend always sets `status` to `Waiting`
- Backend always sets `isDeleted: false` and `deletedAt: null`
- Client-provided `status`, `createdBy`, `isDeleted`, or `deletedAt` values are ignored
- No custom indexes are defined yet; indexes will be added on demand

## Success Output

Status:

```http
201 Created
```

Body:

```json
{
  "success": true,
  "data": {
    "_id": "6a70f2002c0e518d5b689200",
    "createdBy": "6a5638bafc6d6328c9e1b281",
    "name": "Sukhumvit 2BR",
    "description": "Client wants condo near BTS Phrom Phong.",
    "status": "Waiting",
    "geoSearch": {
      "mode": "area",
      "bounds": {
        "northEast": { "lat": 13.77755, "lng": 100.65739 },
        "southWest": { "lat": 13.75304, "lng": 100.62661 }
      },
      "placeName": "Phrom Phong"
    },
    "filters": {
      "minRent": 15000,
      "maxRent": 35000,
      "bedroomCount": 2,
      "buildingType": "Condo",
      "isForeignerAccepted": true,
      "agentProfileIds": ["6a5669f81a9630e315e059a7"]
    },
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-08-03T20:00:00.000Z",
    "updatedAt": "2026-08-03T20:00:00.000Z"
  }
}
```

## What We Checked

- Caller must send a valid access token
- Caller must exist and have `status: "ACTIVE"`
- Backend uses `req.currentUser._id` as `createdBy`
- Backend does not trust `createdBy` from the body
- Create always stores `status: "Waiting"`
- Client-provided `status` is ignored
- Area, nearby, and line geo modes are accepted
- Invalid geo or filter payloads return `422 VALIDATION_ERROR`
- Invalid JSON returns `400 INVALID_JSON`
- Suspended / inactive users return `403`
- Missing / invalid tokens return `401`
- Missing user for a valid-looking token returns `404 USER_NOT_FOUND`
- Database write uses the request session when a valid session is provided

## Error Cases

### Missing Access Token

```http
401 Unauthorized
```

```json
{
  "success": false,
  "code": "ACCESS_TOKEN_REQUIRED",
  "message": "Access token is required"
}
```

### Invalid Access Token

```http
401 Unauthorized
```

```json
{
  "success": false,
  "code": "INVALID_ACCESS_TOKEN",
  "message": "Invalid or expired access token"
}
```

### Inactive Account

```http
403 Forbidden
```

```json
{
  "success": false,
  "code": "ACCOUNT_INACTIVE",
  "message": "Account is inactive"
}
```

### Suspended Account

```http
403 Forbidden
```

```json
{
  "success": false,
  "code": "ACCOUNT_SUSPENDED",
  "message": "Account is suspended"
}
```

### User Not Found

```http
404 Not Found
```

```json
{
  "success": false,
  "code": "USER_NOT_FOUND",
  "message": "User not found"
}
```

### Validation Error

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "geoSearch is required"
}
```

Other common validation messages:

```txt
name is required
bounds must be an object
position is required for nearby search
radiusMeters must be between 1 and 2000
geometry is required for line search
maxRent must be greater than or equal to minRent
Use either agentProfileIds or listerIds, not both
```

### Invalid JSON

```http
400 Bad Request
```

```json
{
  "success": false,
  "code": "INVALID_JSON",
  "message": "Request body must be valid JSON"
}
```

## Running Against Search Later

Stored requests can be unpacked into the existing search endpoints:

| `geoSearch.mode` | Search endpoint | Geo body fields |
| --- | --- | --- |
| `area` | `POST /api/v1/search/buildings/map` | `bounds` |
| `nearby` | `POST /api/v1/search/buildings/nearby` | `position`, `radiusMeters` |
| `line` | `POST /api/v1/search/buildings/near-lines` | `geometry`, `distanceMeters` |

Example area search body built from a saved request:

```json
{
  "bounds": {
    "northEast": { "lat": 13.77755, "lng": 100.65739 },
    "southWest": { "lat": 13.75304, "lng": 100.62661 }
  },
  "minRent": 15000,
  "maxRent": 35000,
  "bedroomCount": 2,
  "buildingType": "Condo",
  "isForeignerAccepted": true,
  "agentProfileIds": ["6a5669f81a9630e315e059a7"],
  "page": 1,
  "limit": 20
}
```
