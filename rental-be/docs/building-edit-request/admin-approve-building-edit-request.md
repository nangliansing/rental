# Admin Approve Building Edit Request

Approve one pending building edit request as a platform `OWNER` or `ADMIN`.

Approval applies the stored `proposedBuilding` snapshot to the target building, marks the request `APPROVED`, records reviewer context, and notifies the requester.

## Endpoint

```http
PATCH /api/v1/admin/building-edit-requests/:buildingEditRequestId/approve
```

Full local URL:

```http
PATCH http://localhost:3000/api/v1/admin/building-edit-requests/6a5d0b78c6f8863a8bd3f05d/approve
```

The old `/confirm` route is intentionally not supported. Use `/approve`.

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
  "reviewReason": "Postman approve building edit success test."
}
```

`reviewReason` is optional.

When omitted, the backend stores:

```txt
Approved
```

Validation:

```txt
reviewReason  optional string, max 1000 characters
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

Suspended or inactive admin users are blocked before approval logic runs.

## Business Rules

Only `PENDING` building edit requests can be approved.

Already `APPROVED` or `REJECTED` requests return:

```json
{
  "success": false,
  "code": "BUILDING_EDIT_REQUEST_NOT_PENDING",
  "message": "Only pending building edit requests can be approved"
}
```

The target building must still exist and must be active:

```js
{
  _id: buildingEditRequest.buildingId,
  isActive: { $ne: false }
}
```

Missing and inactive buildings both return `BUILDING_NOT_FOUND`. This keeps the public error simple and avoids exposing whether a building exists but is inactive.

Approval is transactional:

- load the pending request
- validate and build the building update from `proposedBuilding`
- update the active building
- mark the request `APPROVED`
- create the notification without emitting it yet
- commit the transaction
- emit the socket notification after commit

If any step fails, the building and request stay unchanged.

## Building Update

The backend applies these fields from `proposedBuilding`:

```json
{
  "name": "TEMP Postman Approve Building Edit Name",
  "buildingType": "Apartment",
  "facilities": ["Parking", "Lift", "TEMP Postman Facility"],
  "security": ["CCTV", "Keycard Access"],
  "location": {
    "type": "Point",
    "coordinates": [100.6435, 13.7654]
  },
  "address": "Lat Phrao Road, Khlong Chan, Bang Kapi, Bangkok 10240, Thailand"
}
```

The backend also sets:

```json
{
  "updatedBy": "6a5638c8fc6d6328c9e1b282"
}
```

`updatedBy` always comes from the authenticated admin/owner, not the request body.

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
    "request": {
      "_id": "6a5d0b78c6f8863a8bd3f05d",
      "status": "APPROVED",
      "buildingId": "6a57c6da947d934e03495b7a",
      "requestReason": "TEMP Postman approve building edit request",
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
        "name": "TEMP Postman Approve Building Edit Name",
        "buildingType": "Apartment",
        "facilities": ["Parking", "Lift", "TEMP Postman Facility"],
        "security": ["CCTV", "Keycard Access"],
        "location": {
          "type": "Point",
          "coordinates": [100.6435, 13.7654]
        },
        "address": "Lat Phrao Road, Khlong Chan, Bang Kapi, Bangkok 10240, Thailand"
      },
      "reviewedAt": "2026-07-19T17:38:53.354Z",
      "reviewReason": "Postman approve building edit success test.",
      "createdAt": "2026-07-19T17:38:00.178Z",
      "updatedAt": "2026-07-19T17:38:53.354Z",
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
        "name": "TEMP Postman Approve Building Edit Name",
        "buildingType": "Apartment",
        "facilities": ["Parking", "Lift", "TEMP Postman Facility"],
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
    },
    "building": {
      "_id": "6a57c6da947d934e03495b7a",
      "name": "TEMP Postman Approve Building Edit Name",
      "buildingType": "Apartment",
      "facilities": ["Parking", "Lift", "TEMP Postman Facility"],
      "security": ["CCTV", "Keycard Access"],
      "location": {
        "type": "Point",
        "coordinates": [100.6435, 13.7654]
      },
      "address": "Lat Phrao Road, Khlong Chan, Bang Kapi, Bangkok 10240, Thailand",
      "isActive": true,
      "minRent": 13000,
      "maxRent": 15000,
      "createdBy": "6a5638bafc6d6328c9e1b281",
      "updatedBy": "6a5638c8fc6d6328c9e1b282",
      "createdAt": "2026-07-15T17:43:54.984Z",
      "updatedAt": "2026-07-19T17:38:53.255Z"
    }
  }
}
```

The response includes:

```txt
request   enriched admin building edit request detail
building  updated building document
```

The enriched `request` reuses the same detail lookup shape as:

```http
GET /api/v1/admin/building-edit-requests/:buildingEditRequestId
```

Missing optional lookup targets are preserved as `null` in the enriched request. For example, a requester without an agent profile returns:

```json
{
  "agentProfile": null
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
  "type": "BUILDING_EDIT_APPROVED",
  "title": "Building edit approved",
  "message": "Your proposed changes for TEMP Postman Approve Building Edit Name were approved.",
  "entityType": "BUILDING_EDIT_REQUEST",
  "entityId": "6a5d0b78c6f8863a8bd3f05d",
  "link": "/buildings/6a57c6da947d934e03495b7a/edit",
  "metadata": {
    "buildingEditRequestId": "6a5d0b78c6f8863a8bd3f05d",
    "buildingId": "6a57c6da947d934e03495b7a",
    "reviewReason": "Postman approve building edit success test."
  }
}
```

The notification is intentionally short and user-friendly.

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
  "message": "Only pending building edit requests can be approved"
}
```

### Missing Or Inactive Building

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

### Old Confirm Route

Response:

```http
404 Not Found
```

```json
{
  "success": false,
  "code": "NOT_FOUND",
  "message": "Route not found"
}
```

## Tested Checklist

Postman and service-level checks covered:

- owner login with valid password
- successful approval with custom `reviewReason`
- successful approval with omitted `reviewReason`, defaulting to `Approved`
- building is updated from `proposedBuilding`
- request is marked `APPROVED`
- `reviewedBy`, `reviewedAt`, and `reviewReason` are stored
- response returns both enriched `request` and updated `building`
- notification is created and emitted after commit
- double approve returns `BUILDING_EDIT_REQUEST_NOT_PENDING`
- invalid `buildingEditRequestId`
- missing building edit request
- non-string `reviewReason`
- `reviewReason` longer than 1000 characters
- body array rejected as non-object
- invalid JSON rejected
- old `/confirm` route returns `NOT_FOUND`
- missing bearer token
- empty bearer token
- invalid or expired access token
- normal `USER` receives `FORBIDDEN`
- suspended owner receives `ACCOUNT_SUSPENDED`
- inactive owner receives `ACCOUNT_INACTIVE`
- deleted token user receives `USER_NOT_FOUND`
- missing target building returns `BUILDING_NOT_FOUND`
- inactive target building returns `BUILDING_NOT_FOUND`
- failed missing/inactive building approvals do not approve the request
- temporary Postman records were cleaned up after testing
- building fixture was restored after mutation tests

## Index Notes

This endpoint uses:

- `_id` lookup on `buildingEditRequests`
- `_id` lookup on `buildings`
- `_id` lookups inside the reused admin detail aggregation

Default `_id` indexes cover the approval path. No additional normal or Atlas Search index is needed for this mutation endpoint.
