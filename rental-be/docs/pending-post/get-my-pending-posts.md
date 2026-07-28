# Get My Pending Posts

List the current authenticated active agent's non-deleted pending posts.

Unverified agents can use this endpoint. `AgentProfile.isVerified` and `AgentProfile.isOnline` are display-only fields for this flow.

Each pending post `listing` snapshot includes `availableAt`. See [`../listing/available-at-response.md`](../listing/available-at-response.md).

## Endpoint

```http
GET /api/v1/pending-posts
```

Full local URL:

```http
GET http://localhost:3000/api/v1/pending-posts
```

## Headers

```http
Authorization: Bearer ACCESS_TOKEN
```

## Query Parameters

All query parameters are optional.

| Name | Default | Notes |
| --- | --- | --- |
| `page` | `1` | Integer from `1` to `10000` |
| `limit` | `20` | Integer from `1` to `100` |
| `status` | none | One of `PENDING`, `APPROVED`, `REJECTED`, `CANCELED` |

Example:

```http
GET http://localhost:3000/api/v1/pending-posts?page=1&limit=2&status=PENDING
```

## Success Output

Status:

```http
200 OK
```

Body:

```json
{
  "success": true,
  "data": [
    {
      "_id": "6a579c55e4441dba30375937",
      "status": "PENDING",
      "submittedBy": "6a5638bafc6d6328c9e1b281",
      "existingBuildingId": null,
      "building": {
        "name": "Bangkapi Pending Test Residence",
        "buildingType": "Apartment",
        "facilities": ["Parking", "Lift"],
        "security": ["CCTV", "Keycard Access"],
        "location": {
          "type": "Point",
          "coordinates": [100.6434, 13.7653]
        },
        "address": "Lat Phrao Road, Khlong Chan, Bang Kapi, Bangkok 10240, Thailand"
      },
      "listing": {
        "visibility": "PUBLIC",
        "isForeignerAccepted": true,
        "isTM30Provided": true,
        "rent": 12000,
        "deposit": 24000,
        "moveInCost": 36000,
        "electricRate": null,
        "waterRate": null,
        "bedroomCount": 1,
        "bathroomCount": 1,
        "kitchenType": "Kitchen",
        "size": null,
        "contractMonths": 12,
        "occupancy": 2,
        "isCookingAllowed": true,
        "isPetAllowed": false,
        "facilities": ["Air Conditioner", "Balcony"],
        "media": [
          {
            "publicId": "pending-posts/bangkapi-test-room-1",
            "secureUrl": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
            "resourceType": "image",
            "format": "jpg",
            "width": 800,
            "height": 600,
            "bytes": 120000,
            "position": 0,
            "alt": "Bangkapi pending test room",
            "isCover": true
          }
        ],
        "description": null,
        "availableAt": null
      },
      "reviewNote": null,
      "reviewedBy": null,
      "reviewedAt": null,
      "approvedBuildingId": null,
      "approvedListingId": null,
      "isDeleted": false,
      "createdAt": "2026-07-15T14:42:29.033Z",
      "updatedAt": "2026-07-15T14:42:29.033Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 4
  }
}
```

When no posts match the query:

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

## What The Backend Controls

The backend always uses the authenticated user id.

Frontend cannot request another user's pending posts.

The backend only returns posts where:

- `submittedBy` is the authenticated user
- `isDeleted` is not `true`

## What We Checked

- Caller must send a valid access token.
- Refresh token cannot be used as an access token.
- Caller must exist in the database.
- Caller must have `status: "ACTIVE"`.
- Caller must have a non-deleted agent profile.
- `AgentProfile.isVerified` does not block access.
- `AgentProfile.isOnline` does not block access.
- Backend uses `req.currentUser._id`.
- Only the current user's pending posts are returned.
- Soft-deleted pending posts are hidden.
- Results are sorted by newest first.
- Pagination works with `page` and `limit`.
- Page beyond total returns an empty array.
- Status filtering works.
- Invalid status is rejected.
- Query uses the passed session when a valid session is provided.
- Existing indexes support this query:
  - `{ submittedBy: 1, createdAt: -1, _id: 1 }`
  - `{ submittedBy: 1, status: 1, createdAt: -1, _id: 1 }`
- No new index is needed.

## Error Cases

### Missing Access Token

Response:

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

Response:

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

Response:

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

Response:

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

### Deleted Or Missing User

Response:

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

### Agent Profile Required

Returned when the caller has no agent profile or the profile is soft deleted.

Response:

```http
403 Forbidden
```

```json
{
  "success": false,
  "code": "AGENT_PROFILE_REQUIRED",
  "message": "Agent profile is required"
}
```

### Invalid Status

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid status: INVALID"
}
```

### Invalid Page

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "page must be between 1 and 10000"
}
```

### Invalid Limit

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "limit must be between 1 and 100"
}
```

## Tested But Still Pending Later

This scenario needs a real building document first:

- Response with `existingBuilding` populated for pending posts that reference an existing building.

