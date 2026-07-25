# Admin Approve Pending Post

Approve one non-deleted `PENDING` pending post as a platform `OWNER` or `ADMIN`.

Approval turns the pending post into real platform data by creating a listing and either reusing an existing building or creating a new building from the stored pending-post snapshot.

## Endpoint

```http
PATCH /api/v1/admin/pending-posts/:pendingPostId/approve
```

Full local URL:

```http
PATCH http://localhost:3000/api/v1/admin/pending-posts/6a579711e4441dba30375933/approve
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
  "reason": "Approved after verifying the building location, listing details, and photos."
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
    "_id": "6a579711e4441dba30375933",
    "status": "APPROVED",
    "submittedBy": "6a5638bafc6d6328c9e1b281",
    "existingBuildingId": null,
    "building": {
      "location": {
        "type": "Point",
        "coordinates": [100.6435, 13.7654]
      },
      "name": "Bangkapi Protected Field Residence",
      "buildingType": "Apartment",
      "facilities": ["Parking", "Lift"],
      "security": ["CCTV", "Keycard Access"],
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
    "reviewNote": "Approved after verifying the building location, listing details, and photos.",
    "reviewedBy": "6a5638c8fc6d6328c9e1b282",
    "reviewedAt": "2026-07-15T17:43:55.385Z",
    "approvedBuildingId": "6a57c6da947d934e03495b7a",
    "approvedListingId": "6a57c6db947d934e03495b7b",
    "isDeleted": false,
    "deletedAt": null,
    "deletedBy": null,
    "deleteReason": null,
    "createdAt": "2026-07-15T14:20:01.887Z",
    "updatedAt": "2026-07-15T17:43:55.386Z"
  }
}
```

## What Approval Creates

If `existingBuildingId` is present:

- the existing active building is reused
- `approvedBuildingId` equals `existingBuildingId`
- only a new listing is created

If `existingBuildingId` is `null`:

- a new building is created from the stored pending-post `building` snapshot
- a new listing is created from the stored pending-post `listing` snapshot

The created listing belongs to the original submitter:

```json
{
  "listedBy": "6a5638bafc6d6328c9e1b281",
  "buildingId": "6a57c6da947d934e03495b7a",
  "isDeleted": false
}
```

When a new building is created:

```json
{
  "createdBy": "6a5638bafc6d6328c9e1b281",
  "updatedBy": "6a5638c8fc6d6328c9e1b282",
  "minRent": 13000,
  "maxRent": 13000
}
```

## Notification

This endpoint creates a notification for the original lister inside the same transaction.

The socket notification is emitted only after the transaction commits.

Example notification:

```json
{
  "recipient": "6a5638bafc6d6328c9e1b281",
  "actor": "6a5638c8fc6d6328c9e1b282",
  "type": "PENDING_LISTING_APPROVED",
  "title": "Listing approved: Bangkapi Protected Field Residence",
  "message": "Your listing \"Bangkapi Protected Field Residence (13,000 THB/month)\" has been approved and is now visible to renters. Reason: Approved after verifying the building location, listing details, and photos.",
  "entityType": "LISTING",
  "entityId": "6a57c6db947d934e03495b7b",
  "link": "/listings/6a57c6db947d934e03495b7b",
  "metadata": {
    "pendingPostId": "6a579711e4441dba30375933",
    "listingId": "6a57c6db947d934e03495b7b",
    "buildingId": "6a57c6da947d934e03495b7a",
    "buildingName": "Bangkapi Protected Field Residence",
    "listingLabel": "Bangkapi Protected Field Residence (13,000 THB/month)",
    "reason": "Approved after verifying the building location, listing details, and photos."
  }
}
```

The notification must clearly tell the lister which listing was approved.

## What The Backend Controls

The backend always uses:

- approver id from `req.currentUser._id`
- original lister id from `pendingPost.submittedBy`
- building/listing data from the stored pending-post snapshot
- current server time for `reviewedAt`
- real created/reused ids for `approvedBuildingId` and `approvedListingId`

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
- Only `PENDING` posts can be approved.
- Already approved or rejected posts return `PENDING_POST_ALREADY_REVIEWED`.
- Original submitter user must still exist.
- Original submitter can be `ACTIVE`, `INACTIVE`, or `SUSPENDED`.
- Existing building is reused when `existingBuildingId` is present.
- Missing existing building returns `BUILDING_NOT_FOUND`.
- Inactive existing building returns `BUILDING_INACTIVE`.
- New building is created when no `existingBuildingId` exists.
- Listing is created under the original submitter, not the admin.
- Building rent summary is updated after listing creation.
- Protected frontend fields are ignored.
- Delete metadata is not touched.
- Notification is created for the lister and names the approved listing clearly.
- Database writes use a transaction.
- Failed approval does not partially update the pending post or create a listing.
- Query uses `_id` and `existingBuildingId`; existing indexes are enough.
- No new speculative index is needed.

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

### Deleted Or Missing Approver

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

Returned when the pending post does not exist or is soft deleted.

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

Returned when the pending post is already `APPROVED`, `REJECTED`, or `CANCELED`.

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

### Missing Body

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
  "message": "reason must be a string"
}
```

### Empty Reason

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

### Reason Too Long

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

### Missing Submitted User

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

### Missing Existing Building

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

### Inactive Existing Building

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "BUILDING_INACTIVE",
  "message": "Building is inactive"
}
```
