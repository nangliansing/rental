# Create Pending Post

Create a pending post for admin review. This stores a listing snapshot and either an existing building reference or a new building snapshot.

Unverified agents are allowed to submit pending posts. `AgentProfile.isVerified` and `AgentProfile.isOnline` are display-only fields for this flow.

## Endpoint

```http
POST /api/v1/pending-posts
```

Full local URL:

```http
POST http://localhost:3000/api/v1/pending-posts
```

## Headers

```http
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

## Input

The body must include:

- `listing`
- exactly one building source:
  - `existingBuildingId`, or
  - `building`

Example using a new building snapshot:

```json
{
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
  }
}
```

Example using an existing building:

```json
{
  "existingBuildingId": "000000000000000000000000",
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
        "publicId": "pending-posts/existing-building-room-1",
        "secureUrl": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        "resourceType": "image",
        "format": "jpg",
        "width": 800,
        "height": 600,
        "bytes": 120000,
        "position": 0,
        "alt": "Existing building pending post room",
        "isCover": true
      }
    ],
    "description": "Pending post test listing using an existing building."
  }
}
```

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
    "isDeleted": false,
    "_id": "6a5796ebe4441dba30375932",
    "createdAt": "2026-07-15T14:19:23.548Z",
    "updatedAt": "2026-07-15T14:19:23.548Z"
  }
}
```

## What The Backend Controls

The backend does not trust frontend values for:

- `submittedBy`
- `status`
- `reviewNote`
- `reviewedBy`
- `reviewedAt`
- `approvedBuildingId`
- `approvedListingId`
- `isDeleted`

On create, the backend sets:

- `status: "PENDING"`
- `submittedBy: authenticated user id`
- `reviewNote: null`
- `reviewedBy: null`
- `reviewedAt: null`
- `approvedBuildingId: null`
- `approvedListingId: null`
- `isDeleted: false`

## What We Checked

- Caller must send a valid access token.
- Refresh token cannot be used as an access token.
- Caller must exist in the database.
- Caller must have `status: "ACTIVE"`.
- Caller must have a non-deleted agent profile.
- `AgentProfile.isVerified` does not block submission.
- `AgentProfile.isOnline` does not block submission.
- Backend uses the authenticated user id for `submittedBy`.
- Body must be a valid JSON object.
- Request must include exactly one building source: `existingBuildingId` or `building`.
- New building data is stored as a pending snapshot only.
- Existing building id must be valid and must exist.
- Existing building must not be inactive.
- Listing data is required.
- Listing must include at least one photo.
- Building and listing validation reuse existing building/listing validators.
- Database queries use the passed session when a valid session is provided.
- No new index is required for this create flow.

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

### Body Is Not An Object

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

### Missing Or Duplicate Building Source

This happens when the request has neither `existingBuildingId` nor `building`, or has both.

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Pending post must reference an existing building or include a new building, but not both"
}
```

### Invalid Existing Building Id

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "existingBuildingId must be a valid id"
}
```

### Existing Building Not Found

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

### Missing Listing

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "listing must be an object"
}
```

### Empty Listing Media

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "At least one listing photo is required"
}
```

### Invalid Building Type

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid buildingType: APARTMENT"
}
```

### Invalid Coordinates

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "location.coordinates must be [lng, lat] with valid longitude and latitude"
}
```

### Invalid Listing Field

Example response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "isForeignerAccepted must be a boolean"
}
```

## Tested But Still Pending Later

These scenarios need a real building document first:

- Create pending post with a valid `existingBuildingId`.
- Reject inactive existing building with `BUILDING_INACTIVE`.

