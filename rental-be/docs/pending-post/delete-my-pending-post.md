# Delete My Pending Post

Soft delete one pending-post record owned by the current authenticated active agent.

This endpoint only deletes/hides the pending-post record from the normal owner pending-post list. It does not change moderation status and does not touch approved listings or buildings.

## Endpoint

```http
DELETE /api/v1/pending-posts/:pendingPostId
```

Full local URL:

```http
DELETE http://localhost:3000/api/v1/pending-posts/6a5796ebe4441dba30375932
```

## Headers

```http
Authorization: Bearer ACCESS_TOKEN
```

## Path Parameters

| Name | Required | Notes |
| --- | --- | --- |
| `pendingPostId` | yes | Must be a valid MongoDB ObjectId |

## Input

No request body is required.

The backend does not trust any frontend user id, owner id, status, review field, approval field, or delete metadata.

## Success Output

Status:

```http
200 OK
```

Body:

```json
{
  "success": true,
  "data": {
    "_id": "6a5796ebe4441dba30375932",
    "status": "PENDING",
    "submittedBy": "6a5638bafc6d6328c9e1b281",
    "existingBuildingId": null,
    "building": {
      "location": {
        "type": "Point",
        "coordinates": [100.6434, 13.7653]
      },
      "name": "Bangkapi Pending Test Residence",
      "buildingType": "Apartment",
      "facilities": ["Parking", "Lift"],
      "security": ["CCTV", "Keycard Access"],
      "address": "Lat Phrao Road, Khlong Chan, Bang Kapi, Bangkok 10240, Thailand"
    },
    "listing": {
      "visibility": "PUBLIC",
      "isForeignerAccepted": true,
      "isTM30Provided": true,
      "rent": 12000,
      "deposit": 24000,
      "moveInCost": 36000,
      "electricRate": 8,
      "waterRate": 20,
      "bedroomCount": 1,
      "bathroomCount": 1,
      "kitchenType": "Kitchen",
      "size": 32,
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
      "description": "Pending post test listing near The Mall Lifestore Bangkapi."
    },
    "reviewNote": null,
    "reviewedBy": null,
    "reviewedAt": null,
    "approvedBuildingId": null,
    "approvedListingId": null,
    "isDeleted": true,
    "deleteReason": null,
    "deletedAt": "2026-07-15T16:02:43.328Z",
    "deletedBy": "6a5638bafc6d6328c9e1b281",
    "createdAt": "2026-07-15T14:19:23.548Z",
    "updatedAt": "2026-07-15T16:02:43.329Z"
  }
}
```

## What It Updates

The endpoint soft deletes the pending-post record.

Updated fields:

- `isDeleted: true`
- `deletedAt: current server date`
- `deletedBy: authenticated user id`
- `deleteReason: null`

Fields it does not change:

- `status`
- `reviewNote`
- `reviewedBy`
- `reviewedAt`
- `approvedBuildingId`
- `approvedListingId`
- `building`
- `listing`

It also does not delete approved buildings or listings.

## What We Checked

- Caller must send a valid access token.
- Refresh token cannot be used as an access token.
- Caller must exist in the database.
- Caller must have `status: "ACTIVE"`.
- Caller must have a non-deleted agent profile.
- `AgentProfile.isVerified` does not block delete.
- `AgentProfile.isOnline` does not block delete.
- Backend uses `req.currentUser._id`.
- `pendingPostId` must be valid.
- Only the owner can delete their own pending post.
- Another valid agent gets `PENDING_POST_NOT_FOUND`.
- Already-deleted pending posts return `PENDING_POST_NOT_FOUND`.
- Deleted pending posts are hidden from `GET /api/v1/pending-posts`.
- Delete does not change `status`.
- Delete metadata is stored.
- Database query uses the passed session when a valid session is provided.
- Existing owner query indexes are enough.
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

### Invalid Pending Post Id

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "pendingPostId must be a valid id"
}
```

### Pending Post Not Found

Returned when the pending post does not exist, belongs to another user, or is already deleted.

Response:

```http
404 Not Found
```

```json
{
  "success": false,
  "code": "PENDING_POST_NOT_FOUND",
  "message": "Pending post not found"
}
```

