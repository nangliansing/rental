# Get Building Followers

Get paginated followers for one active building.

This endpoint is public. It returns follow records for the building and populates active follower users when available.

## Endpoint

```http
GET /api/v1/building-follows/buildings/:buildingId
```

Full local URL:

```http
GET http://localhost:3000/api/v1/building-follows/buildings/6a57c6da947d934e03495b7a?page=1&limit=20
```

## Auth

No access token is required.

## Path Params

```txt
buildingId  required, valid Mongo ObjectId
```

## Query Parameters

| Name | Required | Default | Notes |
| --- | --- | --- | --- |
| `page` | no | `1` | Integer between `1` and `10000` |
| `limit` | no | `20` | Integer between `1` and `100` |

## Business Rules

The building must:

- exist
- have `isActive: true`

Missing and inactive buildings both return `BUILDING_NOT_FOUND`.

Follow rows are always returned, sorted by newest follow first:

```txt
createdAt desc
_id desc
```

Pagination is applied before user lookup for performance.

User lookup rules:

- only users with `status: ACTIVE` are populated
- inactive or missing users remain in the follow list with `user: null`

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
    "followers": [
      {
        "_id": "6a5f1c2d4e8b9a0123456789",
        "userId": "6a5638bafc6d6328c9e1b281",
        "buildingId": "6a57c6da947d934e03495b7a",
        "createdAt": "2026-07-31T10:15:30.123Z",
        "updatedAt": "2026-07-31T10:15:30.123Z",
        "user": {
          "_id": "6a5638bafc6d6328c9e1b281",
          "name": "Follow Viewer",
          "displayName": "Fetch Agent",
          "profilePhoto": null,
          "isVerified": false
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

When the follower user is inactive or missing:

```json
{
  "user": null
}
```

## Error Cases

### Building Not Found

Status:

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

### Invalid Building Id

Status:

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

## Implementation Notes

The search pipeline uses:

```txt
$match buildingId
$sort createdAt desc, _id desc
$facet paginate before lookup
$lookup active users
$count total
```

Supporting index:

```txt
{ buildingId: 1, createdAt: -1, _id: -1 }
```

## Tested Checklist

```txt
returns paginated followers with populated active users
returns null user for inactive followers
works without authentication
returns 404 when the building is inactive or missing
returns 422 for an invalid building id
uses default pagination
supports explicit page and limit
returns next page without overlap
returns empty page when page exceeds total
rejects invalid page and limit values
sorts followers by newest follow first
scopes followers to the requested building only
returns mixed populated and null users in one response
falls back to user name when agent profile is missing
```

Automated coverage:

```txt
test/building-follow.fetch.integration.test.js
```
