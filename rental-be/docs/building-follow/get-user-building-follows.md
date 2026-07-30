# Get User Building Follows

Get paginated buildings followed by the authenticated user.

This endpoint is user-scoped. The caller can only read their own followings.

## Endpoint

```http
GET /api/v1/building-follows/users/:userId
```

Full local URL:

```http
GET http://localhost:3000/api/v1/building-follows/users/6a5638bafc6d6328c9e1b281?page=1&limit=20
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

The authenticated user id must match `:userId`. Otherwise the request returns `403`.

Suspended, inactive, deleted, or missing users cannot access this endpoint.

## Path Params

```txt
userId  required, valid Mongo ObjectId
```

## Query Parameters

| Name | Required | Default | Notes |
| --- | --- | --- | --- |
| `page` | no | `1` | Integer between `1` and `10000` |
| `limit` | no | `20` | Integer between `1` and `100` |

## Business Rules

The requested user must:

- exist
- have `status: ACTIVE`

Follow rows are always returned, sorted by newest follow first:

```txt
createdAt desc
_id desc
```

Pagination is applied before building lookup for performance.

Building lookup rules:

- only buildings with `isActive: true` are populated
- inactive, missing, or deleted buildings remain in the follow list with `building: null`

## Success Response

Status:

```http
200 OK
```

Body:

```json
{
  "success": true,
  "data": {
    "followings": [
      {
        "_id": "6a5f1c2d4e8b9a0123456789",
        "userId": "6a5638bafc6d6328c9e1b281",
        "buildingId": "6a57c6da947d934e03495b7a",
        "createdAt": "2026-07-31T10:15:30.123Z",
        "updatedAt": "2026-07-31T10:15:30.123Z",
        "building": {
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
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

When the followed building is inactive or missing:

```json
{
  "building": null
}
```

## Error Cases

### Forbidden

Status:

```http
403 Forbidden
```

```json
{
  "success": false,
  "code": "FORBIDDEN",
  "message": "Forbidden"
}
```

Returned when `:userId` does not match the authenticated user.

### Account Not Active

Status:

```http
403 Forbidden
```

Returned when the authenticated user or requested user is suspended or inactive.

### Invalid User Id

Status:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "userId must be a valid id"
}
```

## Implementation Notes

The search pipeline uses:

```txt
$match userId
$sort createdAt desc, _id desc
$facet paginate before lookup
$lookup active buildings
$count total
```

Supporting index:

```txt
{ userId: 1, createdAt: -1, _id: -1 }
```

Integrity index:

```txt
{ userId: 1, buildingId: 1 } unique
```

## Tested Checklist

```txt
returns paginated followings with populated active buildings
returns null building for inactive or missing buildings
requires authentication and only allows the current user
returns 403 when the requested user is inactive
returns 422 for an invalid user id
allows the authenticated owner to read their followings
uses default pagination
returns next page without overlap
returns empty page when page exceeds total
rejects invalid page and limit values
sorts followings by newest follow first
scopes followings to the requested user only
returns mixed populated and null buildings in one response
```

Automated coverage:

```txt
test/building-follow.fetch.integration.test.js
```
