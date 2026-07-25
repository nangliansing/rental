# Admin Reject Building Edit Request

Reject one pending building edit request as a platform `OWNER` or `ADMIN`.

Rejection marks the request `REJECTED`, records reviewer context, and notifies the requester. It does not mutate the target building.

## Endpoint

```http
PATCH /api/v1/admin/building-edit-requests/:buildingEditRequestId/reject
```

Full local URL:

```http
PATCH http://localhost:3000/api/v1/admin/building-edit-requests/6a5d12aad28d117ec5fc413e/reject
```

## Headers

```http
Authorization: Bearer OWNER_OR_ADMIN_ACCESS_TOKEN
Content-Type: application/json
```

## Path Params

```txt
buildingEditRequestId  required, valid Mongo ObjectId
```

## Request Body

```json
{
  "reviewReason": "Postman reject building edit success test."
}
```

Validation:

```txt
reviewReason  required string, max 1000 characters
body          must be a JSON object
```

Do not send server-controlled fields. If sent, they are ignored by the flow:

```txt
status
reviewedBy
reviewedAt
building
requestedBy
agentProfile
createdAt
updatedAt
```

## Auth Rules

Request is allowed only when:

- access token is valid
- token user exists
- token user status is `ACTIVE`
- token user role is `OWNER` or `ADMIN`

Normal `USER` callers receive `FORBIDDEN`.

Suspended or inactive admin users are blocked before rejection logic runs.

## Business Rules

Only `PENDING` building edit requests can be rejected.

Already `APPROVED` or `REJECTED` requests return:

```json
{
  "success": false,
  "code": "BUILDING_EDIT_REQUEST_NOT_PENDING",
  "message": "Only pending building edit requests can be rejected"
}
```

Reject does not update the building document. The live building remains unchanged even when `proposedBuilding` contains different values.

Rejection is transactional:

- load the pending request
- mark the request `REJECTED`
- store `reviewedBy`, `reviewedAt`, and `reviewReason`
- create the notification without emitting it yet
- commit the transaction
- emit the socket notification after commit

If validation or review state checks fail, the request remains pending and no notification is created.

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
    "_id": "6a5d12aad28d117ec5fc413e",
    "status": "REJECTED",
    "buildingId": "6a57c6da947d934e03495b7a",
    "requestReason": "TEMP Postman reject building edit success test",
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
      "name": "TEMP Postman Reject Building Edit Proposed Name",
      "buildingType": "Apartment",
      "facilities": ["Parking", "Lift"],
      "security": ["CCTV", "Keycard Access"],
      "location": {
        "type": "Point",
        "coordinates": [100.6435, 13.7654]
      },
      "address": "Lat Phrao Road, Khlong Chan, Bang Kapi, Bangkok 10240, Thailand"
    },
    "reviewedAt": "2026-07-19T18:09:59.441Z",
    "reviewReason": "Postman reject building edit success test.",
    "createdAt": "2026-07-19T18:08:42.486Z",
    "updatedAt": "2026-07-19T18:09:59.441Z",
    "requestedBy": {
      "_id": "6a5638bafc6d6328c9e1b281",
      "name": "Test Normal User",
      "email": "test.normal.user@example.com",
      "role": "USER",
      "status": "ACTIVE"
    },
    "agentProfile": {
      "_id": "6a5669f81a9630e315e059a7",
      "userId": "6a5638bafc6d6328c9e1b281",
      "isDeleted": false,
      "displayName": "Patch Restored Agent",
      "profilePhoto": null,
      "phone": "+66899999999",
      "lineUrl": null,
      "whatsappPhone": null,
      "telegramUrl": null,
      "viberPhone": null,
      "supportLanguages": ["English", "Thai"],
      "isVerified": false,
      "isOnline": true
    },
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
      "isActive": true,
      "minRent": 13000,
      "maxRent": 15000
    },
    "reviewedBy": {
      "_id": "6a5638c8fc6d6328c9e1b282",
      "email": "test.owner.user@example.com",
      "name": "Test Owner User",
      "role": "OWNER",
      "status": "ACTIVE"
    }
  }
}
```

The response reuses the same enriched admin building edit request shape as:

```http
GET /api/v1/admin/building-edit-requests/:buildingEditRequestId
```

Missing optional lookup targets are preserved as `null` in the enriched response.

Example:

```json
{
  "agentProfile": null,
  "reviewedBy": null
}
```

## Notification

This endpoint creates a notification for the requester.

Socket emission happens only after the transaction commits.

Example notification payload:

```json
{
  "recipient": "6a5638bafc6d6328c9e1b281",
  "actor": "6a5638c8fc6d6328c9e1b282",
  "type": "BUILDING_EDIT_REJECTED",
  "title": "Building edit not approved",
  "message": "We could not approve your building edit request. Reason: Postman reject building edit success test.",
  "entityType": "BUILDING_EDIT_REQUEST",
  "entityId": "6a5d12aad28d117ec5fc413e",
  "link": "/buildings/6a57c6da947d934e03495b7a/edit",
  "metadata": {
    "buildingEditRequestId": "6a5d12aad28d117ec5fc413e",
    "buildingId": "6a57c6da947d934e03495b7a",
    "reviewReason": "Postman reject building edit success test."
  }
}
```

The notification copy is intentionally simple and user-friendly.

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

### Deleted Or Missing Token User

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

### Invalid Building Edit Request Id

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "buildingEditRequestId must be a valid id"
}
```

### Building Edit Request Not Found

Response:

```http
404 Not Found
```

```json
{
  "success": false,
  "code": "BUILDING_EDIT_REQUEST_NOT_FOUND",
  "message": "Building edit request not found"
}
```

### Building Edit Request Not Pending

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "BUILDING_EDIT_REQUEST_NOT_PENDING",
  "message": "Only pending building edit requests can be rejected"
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

### Missing Review Reason

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reviewReason is required"
}
```

### Null Review Reason

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reviewReason is required"
}
```

### Blank Review Reason

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reviewReason is required"
}
```

### Review Reason Is Not A String

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reviewReason must be a string"
}
```

### Review Reason Too Long

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reviewReason must be at most 1000 characters"
}
```

## Tested Checklist

Postman and service-level checks covered:

- owner login with valid password
- successful rejection of pending request
- response returns enriched rejected request
- `reviewedBy`, `reviewedAt`, and `reviewReason` are stored
- building remains unchanged on reject
- notification is created with `BUILDING_EDIT_REJECTED`
- notification is emitted after commit
- duplicate reject on already `REJECTED` request
- reject already `APPROVED` request
- invalid `buildingEditRequestId`
- missing building edit request
- body array rejected as non-object
- invalid JSON rejected
- missing `reviewReason`
- null `reviewReason`
- blank `reviewReason`
- non-string `reviewReason`
- `reviewReason` longer than 1000 characters
- missing bearer token
- empty bearer token
- invalid or expired access token
- normal `USER` receives `FORBIDDEN`
- suspended owner receives `ACCOUNT_SUSPENDED`
- inactive owner receives `ACCOUNT_INACTIVE`
- deleted token user receives `USER_NOT_FOUND`
- failed validation leaves request pending
- failed validation creates no notification
- temporary Postman records were cleaned up after testing
- owner fixture was restored after account-state tests
- building fixture stayed unchanged

## Index Notes

This endpoint uses:

- `_id` lookup on `buildingEditRequests`
- `_id` lookups inside the reused admin detail aggregation

Default `_id` indexes cover the rejection path. No additional normal or Atlas Search index is needed for this mutation endpoint.
