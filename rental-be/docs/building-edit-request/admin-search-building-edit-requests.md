# Admin Search Building Edit Requests

List building edit requests for admin review.

This endpoint is admin-only. It returns paginated building edit requests with requester, requester agent profile, target building, and reviewer context.

## Endpoint

```http
GET /api/v1/admin/building-edit-requests
```

Full local URL:

```http
GET http://localhost:3000/api/v1/admin/building-edit-requests?page=1&limit=20
```

## Headers

```http
Authorization: Bearer OWNER_OR_ADMIN_ACCESS_TOKEN
```

## Query Params

```txt
status  optional, one of PENDING, APPROVED, REJECTED
page    optional, integer, 1 to 10000, default 1
limit   optional, integer, 1 to 100, default 20
```

Examples:

```http
GET /api/v1/admin/building-edit-requests?page=1&limit=20
GET /api/v1/admin/building-edit-requests?status=PENDING&page=1&limit=20
GET /api/v1/admin/building-edit-requests?status=APPROVED&page=1&limit=20
GET /api/v1/admin/building-edit-requests?status=REJECTED&page=1&limit=20
```

## Auth Rules

Request is allowed only when:

- token is valid
- token user exists
- token user status is `ACTIVE`
- token user role is `OWNER` or `ADMIN`

## Business Rules

When `status` is omitted, all building edit requests are returned.

When `status` is provided, the backend filters by that exact status:

```js
{
  status: "PENDING"
}
```

Valid statuses:

```txt
PENDING
APPROVED
REJECTED
```

Rows are sorted newest first:

```js
{
  createdAt: -1,
  _id: 1
}
```

Pagination uses:

```js
skip = (page - 1) * limit
```

The backend filters, sorts, skips, and limits before lookup enrichment. This keeps list queries efficient because only the current page is enriched.

## Lookup Context

Each returned request can include:

```txt
requestedBy    user who submitted the edit request
agentProfile   agent profile for requestedBy, if present
building       building being edited
reviewedBy     admin/owner who approved or rejected the request
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

Missing lookup targets are preserved as `null` instead of dropping the building edit request. This is intentional because admin history should remain visible even if a related user, agent profile, building, or reviewer is removed later.

Examples:

```json
{
  "agentProfile": null,
  "reviewedBy": null
}
```

## Response Shape

Each row includes:

```json
{
  "_id": "6a5cf2c63ad5cdb9b7deae09",
  "status": "PENDING",
  "buildingId": "6a57c6da947d934e03495b7a",
  "requestReason": "Reason from requester",
  "originalBuilding": {
    "name": "Original building name",
    "buildingType": "Apartment",
    "facilities": ["Wifi"],
    "security": ["CCTV"],
    "location": {
      "type": "Point",
      "coordinates": [100.6435, 13.7654]
    },
    "address": "Original address"
  },
  "proposedBuilding": {
    "name": "Proposed building name",
    "buildingType": "Apartment",
    "facilities": ["Wifi"],
    "security": ["CCTV"],
    "location": {
      "type": "Point",
      "coordinates": [100.6435, 13.7654]
    },
    "address": "Proposed address"
  },
  "reviewedAt": null,
  "reviewReason": null,
  "createdAt": "2026-07-19T15:52:38.155Z",
  "updatedAt": "2026-07-19T15:52:38.155Z",
  "requestedBy": {
    "_id": "6a5638bafc6d6328c9e1b281",
    "name": "Test Normal User",
    "email": "test.normal.user@example.com",
    "role": "USER",
    "status": "ACTIVE"
  },
  "agentProfile": null,
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
    "minRent": 13000,
    "maxRent": 15000,
    "isActive": true
  },
  "reviewedBy": null
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
  "data": [
    {
      "_id": "6a5cf2c63ad5cdb9b7deae09",
      "status": "PENDING",
      "buildingId": "6a57c6da947d934e03495b7a",
      "requestReason": "Reason from requester",
      "originalBuilding": {
        "name": "Original building name",
        "buildingType": "Apartment",
        "facilities": ["Wifi"],
        "security": ["CCTV"],
        "location": {
          "type": "Point",
          "coordinates": [100.6435, 13.7654]
        },
        "address": "Original address"
      },
      "proposedBuilding": {
        "name": "Proposed building name",
        "buildingType": "Apartment",
        "facilities": ["Wifi"],
        "security": ["CCTV"],
        "location": {
          "type": "Point",
          "coordinates": [100.6435, 13.7654]
        },
        "address": "Proposed address"
      },
      "reviewedAt": null,
      "reviewReason": null,
      "createdAt": "2026-07-19T15:52:38.155Z",
      "updatedAt": "2026-07-19T15:52:38.155Z",
      "requestedBy": {
        "_id": "6a5638bafc6d6328c9e1b281",
        "name": "Test Normal User",
        "email": "test.normal.user@example.com",
        "role": "USER",
        "status": "ACTIVE"
      },
      "agentProfile": null,
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
        "minRent": 13000,
        "maxRent": 15000,
        "isActive": true
      },
      "reviewedBy": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

Empty page:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 3,
    "limit": 2,
    "total": 4
  }
}
```

## Validation Errors

Invalid status:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid status: BAD"
}
```

Invalid page:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "page must be between 1 and 10000"
}
```

Invalid limit:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "limit must be between 1 and 100"
}
```

Non-numeric limit:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "limit must be a number"
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

This keeps lookup projection and null behavior consistent between:

```http
GET /api/v1/admin/building-edit-requests
GET /api/v1/admin/building-edit-requests/:buildingEditRequestId
```

## Tested Checklist

Postman and backend smoke tests covered:

- owner login
- list all requests
- filter `status=PENDING`
- filter `status=APPROVED`
- filter `status=REJECTED`
- pagination page 2
- out-of-range page returns empty `data` with correct `total`
- requester with agent profile returns populated `agentProfile`
- requester without agent profile returns `agentProfile: null`
- pending rows return `reviewedBy: null`
- approved/rejected rows return populated `reviewedBy`
- invalid status
- invalid page
- invalid limit range
- non-numeric limit
- missing token
- invalid token
- forbidden normal user
- suspended owner
- inactive owner
- deleted token user returns `USER_NOT_FOUND`

Temporary Postman fixtures were removed after testing.
