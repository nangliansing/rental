# Get Building By Id

Get public details for one active building.

This endpoint is public and read-only. It is used by the building edit request UI to load the current building details before a lister submits a proposed edit.

## Endpoint

```http
GET /api/v1/buildings/:buildingId
```

Full local URL:

```http
GET http://localhost:3000/api/v1/buildings/6a57c6da947d934e03495b7a
```

## Auth

Authentication is optional and is only used to calculate building `isFollowing`.

```http
Authorization: Bearer ACCESS_TOKEN
```

The route uses `optionalAuthenticate`.

| Token / user state | Behavior |
| --- | --- |
| No token | Allow as anonymous |
| Invalid or expired access token | Allow as anonymous |
| Valid token, user `ACTIVE` | Allow as authenticated viewer |
| Valid token, user `SUSPENDED` | Allow as anonymous |
| Valid token, user `INACTIVE` | Allow as anonymous |
| Valid token, user deleted or missing | Allow as anonymous |

Anonymous viewers always get:

```json
{
  "isFollowing": false
}
```

Inactive buildings are hidden from the public endpoint and return the same response as missing buildings.

## Path Params

```txt
buildingId  required, valid Mongo ObjectId
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

This keeps inactive/private building state hidden from public callers.

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
    "_id": "6a57c6da947d934e03495b7a",
    "name": "Bangkapi Protected Field Residence",
    "buildingType": "Apartment",
    "facilities": ["Parking", "Lift"],
    "security": ["CCTV", "Keycard Access"],
    "location": {
      "type": "Point",
      "coordinates": [100.6435, 13.7654]
    },
    "address": "Lat Phrao Road, Khlong Chan, Bang Kapi, Bangkok 10240, Thailand",
    "minRent": 13000,
    "maxRent": 15000,
    "isFollowing": false,
    "createdAt": "2026-07-15T17:43:54.984Z",
    "updatedAt": "2026-07-19T22:21:24.375Z"
  }
}
```

Public projection includes:

```txt
_id
name
buildingType
facilities
security
location
address
minRent
maxRent
isFollowing
createdAt
updatedAt
```

Public projection intentionally excludes:

```txt
isActive
createdBy
updatedBy
```

## Error Cases

### Invalid Building Id

Response:

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

Response:

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

## isFollowing

The building payload always includes `isFollowing`.

- anonymous viewer: `false`
- invalid token: `false`
- suspended/inactive/missing viewer user: `false`
- active viewer who follows the building: `true`
- active viewer who does not follow the building: `false`

Follow/unfollow mutations are handled by the building-follow endpoints. See:

- [`../building-follow/create-building-follow.md`](../building-follow/create-building-follow.md)
- [`../building-follow/delete-building-follow.md`](../building-follow/delete-building-follow.md)

Related endpoint:

- [`get-building-neighbourhood.md`](./get-building-neighbourhood.md) — nearby
  POIs around the building for Explore neighbourhood

## Implementation Notes

The service validates the id with:

```js
validateMongooseId(buildingIdInput, "buildingId")
```

It uses the shared public building projection:

```js
PUBLIC_BUILDING_DETAIL_SELECT
```

and active filter:

```js
ACTIVE_BUILDING_FILTER
```

The query uses `.lean()` because the endpoint is read-only and returns a public DTO-style object.

When a valid active viewer token is present, the controller enriches the building with `isFollowing` through the shared building-follow viewer helper.

## Tested Checklist

Backend smoke:

```txt
active building success
projection excludes createdBy, updatedBy, isActive
includes isFollowing for anonymous and authenticated viewers
invalid buildingId
nonexistent building
inactive building hidden as BUILDING_NOT_FOUND
session supported
fixture restored
```

Postman checklist:

```txt
GET active building success
Optional auth supported
isFollowing false without token
isFollowing true after follow
Projection safe: no createdBy, updatedBy, isActive
Invalid buildingId
Building not found
Inactive building hidden as BUILDING_NOT_FOUND
Fixture restored to active after inactive test
```

Automated coverage:

```txt
test/building-is-following.integration.test.js
test/resolve-is-following.test.js
```
