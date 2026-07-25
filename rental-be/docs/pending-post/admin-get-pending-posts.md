# Admin Get Pending Posts

List non-deleted pending-post submissions for platform moderation as an `OWNER` or `ADMIN`.

This is an admin moderation list. It does not require an agent profile.

## Endpoint

```http
GET /api/v1/admin/pending-posts
```

Full local URL:

```http
GET http://localhost:3000/api/v1/admin/pending-posts
```

## Headers

```http
Authorization: Bearer OWNER_OR_ADMIN_ACCESS_TOKEN
```

## Query Parameters

All query parameters are optional.

| Name | Default | Notes |
| --- | --- | --- |
| `page` | `1` | Integer from `1` to `10000` |
| `limit` | `20` | Integer from `1` to `100` |
| `status` | `PENDING` | One of `PENDING`, `APPROVED`, `REJECTED`, `CANCELED` |

Examples:

```http
GET http://localhost:3000/api/v1/admin/pending-posts
GET http://localhost:3000/api/v1/admin/pending-posts?page=1&limit=2
GET http://localhost:3000/api/v1/admin/pending-posts?status=APPROVED
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
      "_id": "6a579711e4441dba30375933",
      "status": "PENDING",
      "submittedBy": {
        "_id": "6a5638bafc6d6328c9e1b281",
        "name": "Test Normal User",
        "email": "test.normal.user@example.com",
        "role": "USER",
        "status": "ACTIVE"
      },
      "existingBuildingId": null,
      "building": {
        "name": "Bangkapi Protected Field Residence",
        "buildingType": "Apartment",
        "facilities": ["Parking", "Lift"],
        "security": ["CCTV", "Keycard Access"],
        "location": {
          "type": "Point",
          "coordinates": [100.6435, 13.7654]
        },
        "address": "Lat Phrao Road, Khlong Chan, Bang Kapi, Bangkok 10240, Thailand"
      },
      "listing": {
        "visibility": "PUBLIC",
        "isForeignerAccepted": true,
        "isTM30Provided": true,
        "rent": 13000,
        "deposit": 26000,
        "moveInCost": 39000,
        "electricRate": 8,
        "waterRate": 20,
        "bedroomCount": 1,
        "bathroomCount": 1,
        "kitchenType": "Kitchen",
        "size": 34,
        "contractMonths": 12,
        "occupancy": 2,
        "isCookingAllowed": true,
        "isPetAllowed": false,
        "facilities": ["Air Conditioner", "Balcony"],
        "media": [
          {
            "publicId": "pending-posts/bangkapi-protected-field-room",
            "secureUrl": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
            "resourceType": "image",
            "format": "jpg",
            "width": 800,
            "height": 600,
            "bytes": 120000,
            "position": 0,
            "alt": "Protected field pending post room",
            "isCover": true
          }
        ],
        "description": "Protected field test for pending post creation."
      },
      "reviewNote": null,
      "reviewedBy": null,
      "reviewedAt": null,
      "approvedBuildingId": null,
      "approvedListingId": null,
      "isDeleted": false,
      "createdAt": "2026-07-15T14:20:01.887Z",
      "updatedAt": "2026-07-15T14:20:01.887Z",
      "agentProfile": {
        "_id": "6a5669f81a9630e315e059a7",
        "userId": "6a5638bafc6d6328c9e1b281",
        "displayName": "Patch Restored Agent",
        "profilePhoto": null,
        "description": null,
        "phone": "+66899999999",
        "lineUrl": null,
        "whatsappPhone": null,
        "telegramUrl": null,
        "viberPhone": null,
        "supportLanguages": ["English", "Thai"],
        "isVerified": false,
        "isOnline": true
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3
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

When the requested page is beyond available data:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 3,
    "limit": 2,
    "total": 3
  }
}
```

## What The Backend Controls

The backend reads the caller from the access token and fresh database user record.

Frontend cannot choose admin role, owner role, submitter, review fields, or delete fields.

The backend only returns pending posts where:

- `isDeleted` is not `true`
- `status` matches the query status, defaulting to `PENDING`

Returned `submittedBy` data is a safe user summary and does not include password or auth-sensitive fields.

## What We Checked

- Caller must send a valid access token.
- Refresh token cannot be used as an access token.
- Caller must exist in the database.
- Caller must have `status: "ACTIVE"`.
- Caller must have current DB role `OWNER` or `ADMIN`.
- Normal `USER` receives `FORBIDDEN`.
- This endpoint does not require an agent profile.
- Default status is `PENDING`.
- Explicit status filtering works for `PENDING`, `APPROVED`, `REJECTED`, and `CANCELED`.
- Soft-deleted pending posts are hidden.
- Submitted user summary is populated safely.
- Non-deleted agent profile summary is populated when available.
- Results are sorted by newest first.
- Pagination works with `page` and `limit`.
- Page beyond total returns an empty array.
- Invalid status is rejected.
- Query uses the passed session when a valid session is provided.
- Existing indexes support this query:
  - `{ status: 1, createdAt: -1, _id: 1 }`
  - `{ createdAt: -1, _id: 1 }`
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

### Forbidden Role

Returned when the caller is an active normal `USER`.

Response:

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
