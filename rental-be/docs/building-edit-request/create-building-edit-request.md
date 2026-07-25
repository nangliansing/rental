# Create Building Edit Request

Create a pending request to edit an existing active building.

This endpoint is for authenticated listers. It stores both the current building snapshot and the proposed building snapshot. Admins can later approve or reject the request.

## Endpoint

```http
POST /api/v1/building-edit-requests
```

Full local URL:

```http
POST http://localhost:3000/api/v1/building-edit-requests
```

## Headers

```http
Authorization: Bearer USER_ACCESS_TOKEN
Content-Type: application/json
```

## Auth Rules

Request is allowed only when:

- access token is valid
- token user exists
- token user status is `ACTIVE`
- token user has a non-deleted agent profile

Users without an agent profile receive:

```json
{
  "success": false,
  "code": "AGENT_PROFILE_REQUIRED",
  "message": "Agent profile is required"
}
```

Suspended and inactive users are blocked before create logic runs.

## Request Body

```json
{
  "buildingId": "6a57c6da947d934e03495b7a",
  "requestReason": "Postman create building edit request success test.",
  "proposedBuilding": {
    "name": "TEMP Postman Create Building Edit Request Name",
    "buildingType": "Apartment",
    "facilities": ["Parking", "Lift"],
    "security": ["CCTV", "Keycard Access"],
    "location": {
      "type": "Point",
      "coordinates": [100.6435, 13.7654]
    },
    "address": "Lat Phrao Road, Khlong Chan, Bang Kapi, Bangkok 10240, Thailand"
  }
}
```

Validation:

```txt
body                         required JSON object
buildingId                   required valid Mongo ObjectId
requestReason                optional string, max 1000 characters
proposedBuilding             required object
proposedBuilding.name        required string, max 255 characters
proposedBuilding.buildingType enum: Apartment, Mansion, Dormitory, Condo, Other
proposedBuilding.facilities  string array, values listed below
proposedBuilding.security    string array, values listed below
proposedBuilding.location    required GeoJSON Point
proposedBuilding.address     optional string, max 500 characters
```

Valid `facilities`:

```txt
Parking
Lift
Wifi
Laundry
Gym
Swimming Pool
```

Valid `security`:

```txt
CCTV
Security Guard
Keycard Access
Access Control
Gated Entrance
Fire Alarm
Smoke Detector
Emergency Exit
```

`location.coordinates` must be `[lng, lat]`:

```json
{
  "type": "Point",
  "coordinates": [100.6435, 13.7654]
}
```

Longitude must be between `-180` and `180`. Latitude must be between `-90` and `90`.

Do not send server-controlled fields. If sent, they are ignored by the flow:

```txt
status
requestedBy
originalBuilding
reviewedBy
reviewedAt
reviewReason
createdAt
updatedAt
```

## Business Rules

The target building must exist.

The target building must be active. Inactive buildings return:

```json
{
  "success": false,
  "code": "BUILDING_INACTIVE",
  "message": "Building is inactive"
}
```

At least one proposed building field must differ from the current building snapshot. `facilities` and `security` are compared order-insensitively, so reordering values does not count as a change.

No-change requests return:

```json
{
  "success": false,
  "code": "NO_BUILDING_CHANGES",
  "message": "At least one building field must be changed"
}
```

Each requester can have only one `PENDING` edit request per building. A duplicate pending request returns:

```json
{
  "success": false,
  "code": "BUILDING_EDIT_REQUEST_ALREADY_PENDING",
  "message": "You already have a pending edit request for this building"
}
```

Blank `requestReason` values are normalized to `null`.

The endpoint does not update the building immediately. It only creates a pending review request. The building is updated later by:

```http
PATCH /api/v1/admin/building-edit-requests/:buildingEditRequestId/approve
```

## Response Shape

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
    "buildingId": "6a57c6da947d934e03495b7a",
    "requestedBy": "6a5638bafc6d6328c9e1b281",
    "requestReason": "Postman create building edit request success test.",
    "originalBuilding": {
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
    "proposedBuilding": {
      "name": "TEMP Postman Create Building Edit Request Name",
      "buildingType": "Apartment",
      "facilities": ["Parking", "Lift"],
      "security": ["CCTV", "Keycard Access"],
      "location": {
        "type": "Point",
        "coordinates": [100.6435, 13.7654]
      },
      "address": "Lat Phrao Road, Khlong Chan, Bang Kapi, Bangkok 10240, Thailand"
    },
    "reviewedBy": null,
    "reviewedAt": null,
    "reviewReason": null,
    "_id": "6a5d1a07dfc9645116c34d4f",
    "createdAt": "2026-07-19T18:40:08.000Z",
    "updatedAt": "2026-07-19T18:40:08.000Z"
  }
}
```

`originalBuilding` is captured from the current building at request creation time.

`proposedBuilding` is the validated and normalized proposed snapshot.

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

### User Not Found

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

### Suspended User

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

### Inactive User

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

### Agent Profile Required

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

This also applies when the user's agent profile exists but is soft-deleted.

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

### Body Must Be Object

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

### Building Inactive

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

### Duplicate Pending Request

Response:

```http
409 Conflict
```

```json
{
  "success": false,
  "code": "BUILDING_EDIT_REQUEST_ALREADY_PENDING",
  "message": "You already have a pending edit request for this building"
}
```

### No Building Changes

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "NO_BUILDING_CHANGES",
  "message": "At least one building field must be changed"
}
```

### Validation Errors

Examples:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "name is required"
}
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid buildingType: Castle"
}
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid facilities: Bad Facility"
}
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid security: Bad Security"
}
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "location.coordinates must be [lng, lat] with valid longitude and latitude"
}
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "requestReason must be at most 1000 characters"
}
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "address must be at most 500 characters"
}
```

## Indexes

The model defines a partial unique index to protect against duplicate pending requests:

```js
{
  buildingId: 1,
  requestedBy: 1,
  status: 1
}
```

With:

```js
{
  unique: true,
  partialFilterExpression: {
    status: "PENDING"
  }
}
```

The service also checks for an existing pending request before insert so users receive a clean `BUILDING_EDIT_REQUEST_ALREADY_PENDING` error.

## Tested Checklist

Backend scenario suite:

```txt
25/25 passed
```

Postman checklist:

```txt
Login success
Create success
Duplicate pending request
No actual building changes
Invalid buildingId
Building not found
Missing proposedBuilding
Invalid name
Invalid buildingType
Invalid facilities
Invalid security
Invalid coordinates
requestReason too long
address too long
Blank requestReason becomes null
Body must be object
Invalid JSON
Missing access token
Empty Bearer token
Invalid access token
User without agent profile
Suspended user
Inactive user
Inactive building
Deleted agent profile
User not found from otherwise valid token
```

Temporary Postman records were closed after testing, and shared fixtures were restored.
