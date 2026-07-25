# Admin Get Building Edit Request By Id

Get one building edit request for admin review.

This endpoint is admin-only. It returns a single building edit request enriched with requester, requester agent profile, target building, and reviewer context.

## Endpoint

```http
GET /api/v1/admin/building-edit-requests/:buildingEditRequestId
```

Full local URL:

```http
GET http://localhost:3000/api/v1/admin/building-edit-requests/6a5d029afd17935ef0d081d6
```

## Headers

```http
Authorization: Bearer OWNER_OR_ADMIN_ACCESS_TOKEN
```

## Path Params

```txt
buildingEditRequestId  required, valid Mongo ObjectId
```

## Auth Rules

Request is allowed only when:

- token is valid
- token user exists
- token user status is `ACTIVE`
- token user role is `OWNER` or `ADMIN`

## Business Rules

The backend validates `buildingEditRequestId`, loads the matching building edit request, and returns `BUILDING_EDIT_REQUEST_NOT_FOUND` when no request exists.

The response includes the building edit request regardless of status:

```txt
PENDING
APPROVED
REJECTED
```

For `PENDING` requests:

```json
{
  "reviewedBy": null,
  "reviewedAt": null,
  "reviewReason": null
}
```

For `APPROVED` or `REJECTED` requests, `reviewedBy`, `reviewedAt`, and `reviewReason` should be populated.

## Lookup Context

The endpoint reuses the same admin building edit request lookup stages as the list endpoint.

Each response can include:

```txt
requestedBy    user who submitted the edit request
agentProfile   agent profile for requestedBy, if present
building       building being edited
reviewedBy     admin/owner who approved or rejected the request
```

Missing lookup targets are preserved as `null` instead of dropping the building edit request. This is intentional because admin history should remain visible even if a related user, agent profile, building, or reviewer is removed later.

Examples:

```json
{
  "agentProfile": null,
  "reviewedBy": null
}
```

User lookup projection:

```json
{
  "_id": "6a5638bafc6d6328c9e1b281",
  "name": "Test Normal User",
  "email": "test.normal.user@example.com",
  "role": "USER",
  "status": "ACTIVE"
}
```

Agent profile lookup projection:

```json
{
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
}
```

Building lookup projection:

```json
{
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
  "minRent": 13000,
  "maxRent": 15000,
  "isActive": true
}
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
  "data": {
    "_id": "6a5d029afd17935ef0d081d6",
    "status": "PENDING",
    "buildingId": "6a57c6da947d934e03495b7a",
    "requestReason": "TEMP Postman admin building edit request detail PENDING with agent",
    "originalBuilding": {
      "name": "TEMP Postman BER Detail Original Building",
      "buildingType": "Apartment",
      "facilities": ["Wifi"],
      "security": ["CCTV"],
      "location": {
        "type": "Point",
        "coordinates": [100.6435, 13.7654]
      },
      "address": "TEMP Postman BER Detail Original Address"
    },
    "proposedBuilding": {
      "name": "TEMP Postman BER Detail Proposed Building",
      "buildingType": "Apartment",
      "facilities": ["Wifi", "Lift"],
      "security": ["CCTV"],
      "location": {
        "type": "Point",
        "coordinates": [100.6435, 13.7654]
      },
      "address": "TEMP Postman BER Detail Proposed Address"
    },
    "reviewedAt": null,
    "reviewReason": null,
    "createdAt": "2026-07-19T17:00:10.816Z",
    "updatedAt": "2026-07-19T17:00:10.816Z",
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
    "reviewedBy": null
  }
}
```

Reviewed request example:

```json
{
  "success": true,
  "data": {
    "_id": "6a5d029afd17935ef0d081d7",
    "status": "APPROVED",
    "reviewedAt": "2026-07-19T17:00:10.386Z",
    "reviewReason": "TEMP Postman approved detail fixture",
    "reviewedBy": {
      "_id": "6a5638c8fc6d6328c9e1b282",
      "name": "Test Owner User",
      "email": "test.owner.user@example.com",
      "role": "OWNER",
      "status": "ACTIVE"
    }
  }
}
```

No agent profile example:

```json
{
  "success": true,
  "data": {
    "_id": "6a5d029afd17935ef0d081d8",
    "status": "REJECTED",
    "agentProfile": null
  }
}
```

## Validation Errors

Invalid `buildingEditRequestId`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "buildingEditRequestId must be a valid id"
}
```

## Not Found Errors

Missing request:

```json
{
  "success": false,
  "code": "BUILDING_EDIT_REQUEST_NOT_FOUND",
  "message": "Building edit request not found"
}
```

## Auth Errors

Missing token:

```json
{
  "success": false,
  "code": "ACCESS_TOKEN_REQUIRED",
  "message": "Access token is required"
}
```

Invalid token:

```json
{
  "success": false,
  "code": "INVALID_ACCESS_TOKEN",
  "message": "Invalid or expired access token"
}
```

Forbidden role:

```json
{
  "success": false,
  "code": "FORBIDDEN",
  "message": "Forbidden"
}
```

Suspended account:

```json
{
  "success": false,
  "code": "ACCOUNT_SUSPENDED",
  "message": "Account is suspended"
}
```

Inactive account:

```json
{
  "success": false,
  "code": "ACCOUNT_INACTIVE",
  "message": "Account is inactive"
}
```

Deleted token user:

```json
{
  "success": false,
  "code": "USER_NOT_FOUND",
  "message": "User not found"
}
```

## Implementation Notes

The endpoint is protected by the parent admin router:

```js
router.use(
  authenticate,
  requireActiveUser,
  authorizeRoles(USER_ROLES.OWNER, USER_ROLES.ADMIN)
);
```

The module route does not duplicate auth middleware.

Search and detail use the same shared aggregation helpers:

```txt
modules/building-edit-request/utils/admin-building-edit-request-aggregation.js
```

Detail aggregation matches by `_id`, limits to one document, then applies lookup enrichment:

```js
[
  { $match: { _id: buildingEditRequestId } },
  { $limit: 1 },
  ...buildAdminBuildingEditRequestLookupStages()
]
```

This keeps lookup projection and null behavior consistent between:

```http
GET /api/v1/admin/building-edit-requests
GET /api/v1/admin/building-edit-requests/:buildingEditRequestId
```

## Tested Checklist

Postman and backend smoke tests covered:

- owner login
- valid pending detail with populated `requestedBy`, `agentProfile`, and `building`
- pending detail returns `reviewedBy: null`, `reviewedAt: null`, and `reviewReason: null`
- valid approved detail with populated `reviewedBy`
- valid rejected detail from requester without agent profile returns `agentProfile: null`
- invalid `buildingEditRequestId`
- valid-looking missing `buildingEditRequestId`
- missing token
- empty bearer token
- invalid token
- forbidden normal user
- suspended owner
- inactive owner
- deleted token user returns `USER_NOT_FOUND`

Temporary Postman fixtures were removed after testing.
