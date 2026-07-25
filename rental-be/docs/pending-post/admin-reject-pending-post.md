# Admin Reject Pending Post

Reject one non-deleted `PENDING` pending post as a platform `OWNER` or `ADMIN`.

Reject is a moderation action only. It does not create a building, does not create a listing, and does not change delete metadata.

## Endpoint

```http
PATCH /api/v1/admin/pending-posts/:pendingPostId/reject
```

Full local URL:

```http
PATCH http://localhost:3000/api/v1/admin/pending-posts/6a58d00c9d0e348abfdd801c/reject
```

## Headers

```http
Authorization: Bearer OWNER_OR_ADMIN_ACCESS_TOKEN
Content-Type: application/json
```

## Path Parameters

| Name | Required | Notes |
| --- | --- | --- |
| `pendingPostId` | yes | Must be a valid MongoDB ObjectId |

## Input

```json
{
  "reason": "Rejected because the listing photos need clearer room views."
}
```

`reason` is required and must be a non-empty string with at most `1000` characters.

Do not send server-controlled fields. If sent, they are ignored:

- `status`
- `reviewNote`
- `reviewedBy`
- `reviewedAt`
- `approvedBuildingId`
- `approvedListingId`
- `isDeleted`
- `deletedAt`
- `deletedBy`
- `deleteReason`
- `submittedBy`
- `building`
- `listing`

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
    "_id": "6a58d00c9d0e348abfdd801c",
    "status": "REJECTED",
    "submittedBy": "6a5638bafc6d6328c9e1b281",
    "existingBuildingId": null,
    "building": {
      "location": {
        "type": "Point",
        "coordinates": [100.6439, 13.7672]
      },
      "name": "Reject Protected Field Residence",
      "buildingType": "Apartment",
      "facilities": ["Parking", "Lift"],
      "security": ["CCTV", "Keycard Access"],
      "address": "Lat Phrao Road, Khlong Chan, Bang Kapi, Bangkok 10240, Thailand"
    },
    "listing": {
      "visibility": "PUBLIC",
      "isForeignerAccepted": true,
      "isTM30Provided": true,
      "rent": 13800,
      "deposit": 27600,
      "moveInCost": 41400,
      "electricRate": 8,
      "waterRate": 20,
      "bedroomCount": 1,
      "bathroomCount": 1,
      "kitchenType": "Kitchen",
      "size": 35,
      "contractMonths": 12,
      "occupancy": 2,
      "isCookingAllowed": true,
      "isPetAllowed": false,
      "facilities": ["Air Conditioner", "Balcony"],
      "media": [
        {
          "publicId": "pending-posts/reject-protected-field-test",
          "secureUrl": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
          "resourceType": "image",
          "format": "jpg",
          "width": 800,
          "height": 600,
          "bytes": 120000,
          "position": 0,
          "alt": "Reject protected field test room",
          "isCover": true
        }
      ],
      "description": "Pending post for reject protected field test."
    },
    "reviewNote": "Protected field reject test.",
    "reviewedBy": "6a5638c8fc6d6328c9e1b282",
    "reviewedAt": "2026-07-16T12:36:15.581Z",
    "approvedBuildingId": null,
    "approvedListingId": null,
    "isDeleted": false,
    "deletedAt": null,
    "deletedBy": null,
    "deleteReason": null,
    "createdAt": "2026-07-16T12:35:24.957Z",
    "updatedAt": "2026-07-16T12:36:15.582Z"
  }
}
```

## What Reject Changes

Reject updates only the moderation fields:

```json
{
  "status": "REJECTED",
  "reviewNote": "Rejected because the listing photos need clearer room views.",
  "reviewedBy": "6a5638c8fc6d6328c9e1b282",
  "reviewedAt": "2026-07-16T12:36:15.581Z",
  "approvedBuildingId": null,
  "approvedListingId": null
}
```

Reject does not create platform data:

- no building is created
- no listing is created
- `approvedBuildingId` stays `null`
- `approvedListingId` stays `null`

Reject does not touch delete metadata:

- `isDeleted` stays unchanged
- `deletedAt` stays unchanged
- `deletedBy` stays unchanged
- `deleteReason` stays unchanged

## Notification

This endpoint creates a notification for the original lister inside the same transaction.

The socket notification is emitted only after the transaction commits.

Example notification:

```json
{
  "recipient": "6a5638bafc6d6328c9e1b281",
  "actor": "6a5638c8fc6d6328c9e1b282",
  "type": "PENDING_LISTING_REJECTED",
  "title": "Listing not approved: your listing 13,800 THB/month at Reject Protected Field Residence",
  "message": "Your listing \"your listing 13,800 THB/month at Reject Protected Field Residence\" was not approved. Reason: Protected field reject test.",
  "entityType": "PENDING_LISTING",
  "entityId": "6a58d00c9d0e348abfdd801c",
  "link": "/profile",
  "metadata": {
    "pendingPostId": "6a58d00c9d0e348abfdd801c",
    "existingBuildingId": null,
    "buildingName": "Reject Protected Field Residence",
    "listingLabel": "your listing 13,800 THB/month at Reject Protected Field Residence",
    "reason": "Protected field reject test."
  }
}
```

The notification must clearly tell the lister which listing was rejected.

If the pending post uses an existing building and the building still exists, the notification uses the existing building name.

If the pending post uses an existing building that no longer exists, the notification falls back to a rent-based label, for example:

```json
{
  "title": "Listing not approved: your listing 16,500 THB/month",
  "metadata": {
    "buildingName": null,
    "listingLabel": "your listing 16,500 THB/month"
  }
}
```

## What The Backend Controls

The backend always uses:

- reviewer id from `req.currentUser._id`
- original lister id from `pendingPost.submittedBy`
- current server time for `reviewedAt`
- `reason` as the stored `reviewNote`
- `REJECTED` as the stored `status`
- `null` for `approvedBuildingId`
- `null` for `approvedListingId`

Frontend can only provide `reason`.

## What We Checked

- Caller must send a valid access token.
- Refresh token cannot be used as an access token.
- Caller must exist in the database.
- Caller must have `status: "ACTIVE"`.
- Caller must have current DB role `OWNER` or `ADMIN`.
- Normal `USER` receives `FORBIDDEN`.
- `pendingPostId` must be valid.
- Request body must be an object.
- Invalid JSON is rejected.
- `reason` is required.
- `reason` must be a string.
- `reason` must be at most `1000` characters.
- Pending post must exist and must not be soft deleted.
- Only `PENDING` posts can be rejected.
- Already approved or rejected posts return `PENDING_POST_ALREADY_REVIEWED`.
- Original submitter user must still exist.
- Original submitter can be `ACTIVE`, `INACTIVE`, or `SUSPENDED`.
- Missing original submitter returns `USER_NOT_FOUND`.
- Protected frontend fields are ignored.
- No building is created.
- No listing is created.
- Delete metadata is not touched.
- Notification is created for the lister and names the rejected listing clearly.
- Query and write operations use the passed session when a valid session is provided.
- Reject update and notification creation are atomic inside the same transaction.

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

### Suspended Caller

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

### Inactive Caller

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

### Already Reviewed

Response:

```http
409 Conflict
```

```json
{
  "success": false,
  "code": "PENDING_POST_ALREADY_REVIEWED",
  "message": "Pending post has already been reviewed"
}
```

### Missing Submitter

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

### Invalid Body

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "body must be an object"
}
```

### Invalid JSON

Response:

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

### Missing Reason

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reason is required"
}
```

### Non-string Reason

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reason must be a string"
}
```

### Long Reason

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reason must be at most 1000 characters"
}
```
