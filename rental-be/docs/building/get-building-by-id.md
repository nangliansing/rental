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

No access token is required.

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

## Tested Checklist

Backend smoke:

```txt
active building success
projection excludes createdBy, updatedBy, isActive
invalid buildingId
nonexistent building
inactive building hidden as BUILDING_NOT_FOUND
session supported
fixture restored
```

Postman checklist:

```txt
GET active building success
No auth required
Projection safe: no createdBy, updatedBy, isActive
Invalid buildingId
Building not found
Inactive building hidden as BUILDING_NOT_FOUND
Fixture restored to active after inactive test
```
