# Admin Update Listing Report Status

Review and close one open listing report.

This endpoint is admin-only. It lets an `OWNER` or `ADMIN` mark an open listing report as reviewed, dismissed, or action taken. The response returns the enriched listing report detail.

## Endpoint

```http
PATCH /api/v1/admin/reports/:reportId/status
```

Full local URL:

```http
PATCH http://localhost:3000/api/v1/admin/reports/6a5bd135377f8b0548e47cb8/status
```

## Headers

```http
Authorization: Bearer OWNER_OR_ADMIN_ACCESS_TOKEN
Content-Type: application/json
```

## Path Params

```txt
reportId  required, valid report id
```

## Request Body

Mark as reviewed:

```json
{
  "status": "REVIEWED"
}
```

Dismiss:

```json
{
  "status": "DISMISSED",
  "reviewNote": "No platform issue found."
}
```

Take action:

```json
{
  "status": "ACTION_TAKEN",
  "reviewNote": "Listing details were corrected."
}
```

Fields:

```txt
status      required, one of REVIEWED, DISMISSED, ACTION_TAKEN
reviewNote  optional for REVIEWED, required for DISMISSED and ACTION_TAKEN, max 1000 characters
```

`OPEN` is not accepted as an update target. New listing reports start as `OPEN`; this endpoint closes an open report into a reviewed state.

## Auth Rules

Request is allowed only when:

- token is valid
- token user exists
- token user status is `ACTIVE`
- token user role is `OWNER` or `ADMIN`

## Business Rules

Only open listing reports can be updated:

```js
{
  _id: reportId,
  targetType: "LISTING",
  status: "OPEN"
}
```

Missing reports return `REPORT_NOT_FOUND`.

Reports that already have a non-`OPEN` status return `REPORT_NOT_OPEN`.

The update is atomic. The backend first confirms the report exists and is open, then updates with a guarded `findOneAndUpdate` that still requires `targetType: "LISTING"` and `status: "OPEN"`. This protects against two admins reviewing the same report at the same time.

## Status Effects

`REVIEWED`:

```json
{
  "status": "REVIEWED",
  "reviewedBy": "OWNER_OR_ADMIN_USER_ID",
  "reviewedAt": "now",
  "reviewNote": null
}
```

`DISMISSED`:

```json
{
  "status": "DISMISSED",
  "reviewedBy": "OWNER_OR_ADMIN_USER_ID",
  "reviewedAt": "now",
  "reviewNote": "No platform issue found."
}
```

`ACTION_TAKEN`:

```json
{
  "status": "ACTION_TAKEN",
  "reviewedBy": "OWNER_OR_ADMIN_USER_ID",
  "reviewedAt": "now",
  "reviewNote": "Listing details were corrected."
}
```

## Notifications

The reporter receives one notification after the report is reviewed.

Notification creation happens inside the transaction. Socket emission happens only after the transaction commits.

Notification copy is intentionally simple and user-friendly:

```txt
REVIEWED      We reviewed your listing report...
DISMISSED     We reviewed your listing report... and did not find a platform issue.
ACTION_TAKEN  We reviewed your listing report... and took action.
```

When the building is available, the message includes the building name:

```txt
We reviewed your listing report for Bangkapi Protected Field Residence...
```

When `reviewNote` is present, only the first non-empty line is included in the public notification metadata and message.

Notification metadata:

```json
{
  "reportId": "6a5bd135377f8b0548e47cb8",
  "listingId": "6a57d0e4947d934e03495b84",
  "buildingId": "6a57c6da947d934e03495b7a",
  "reason": "Listing details were corrected."
}
```

## Response Shape

The response reuses the admin listing report detail shape. It can include:

```txt
reportedBy           user who submitted the listing report
listing              reported listing snapshot
listingOwner         user who owns the reported listing
listingAgentProfile  agent profile for the listing owner, if present
building             building attached to the listing
reviewedBy           admin/owner who reviewed the report
```

Lookup targets are optional historical context. If a related user, listing, agent profile, or building no longer exists, the report is still returned and clients should treat the enriched fields as nullable or optional.

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
    "_id": "6a5bd135377f8b0548e47cb8",
    "targetType": "LISTING",
    "listingId": "6a57d0e4947d934e03495b84",
    "reportedBy": {
      "_id": "6a5638bafc6d6328c9e1b281",
      "name": "Test Normal User",
      "email": "test.normal.user@example.com",
      "role": "USER",
      "status": "ACTIVE"
    },
    "reason": "WRONG_PRICE",
    "note": "TEMP Postman admin update report status ACTION_TAKEN test",
    "status": "ACTION_TAKEN",
    "reviewedBy": {
      "_id": "6a5638c8fc6d6328c9e1b282",
      "name": "Test Owner User",
      "email": "test.owner.user@example.com",
      "role": "OWNER",
      "status": "ACTIVE"
    },
    "reviewedAt": "2026-07-18T19:17:46.133Z",
    "reviewNote": "Listing details were corrected.",
    "createdAt": "2026-07-18T19:17:09.131Z",
    "updatedAt": "2026-07-18T19:17:46.133Z",
    "listing": {
      "_id": "6a57d0e4947d934e03495b84",
      "visibility": "PUBLIC",
      "rent": 14000,
      "deposit": 28000,
      "moveInCost": 42000,
      "bedroomCount": 1,
      "bathroomCount": 1,
      "kitchenType": "Kitchen",
      "size": 36,
      "contractMonths": 12,
      "occupancy": 2,
      "media": [
        {
          "publicId": "pending-posts/existing-building-approve-test",
          "secureUrl": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
          "resourceType": "image",
          "format": "jpg",
          "width": 800,
          "height": 600,
          "bytes": 120000,
          "position": 0,
          "alt": "Existing building approve test room",
          "isCover": true
        }
      ],
      "description": "Pending post using an existing building for approve test.",
      "isDeleted": false,
      "listedBy": "6a5638bafc6d6328c9e1b281",
      "buildingId": "6a57c6da947d934e03495b7a",
      "createdAt": "2026-07-15T18:26:44.251Z",
      "updatedAt": "2026-07-17T20:00:17.527Z"
    },
    "listingOwner": {
      "_id": "6a5638bafc6d6328c9e1b281",
      "name": "Test Normal User",
      "email": "test.normal.user@example.com",
      "role": "USER",
      "status": "ACTIVE"
    },
    "listingAgentProfile": {
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
      "location": {
        "type": "Point",
        "coordinates": [100.6435, 13.7654]
      },
      "address": "Lat Phrao Road, Khlong Chan, Bang Kapi, Bangkok 10240, Thailand",
      "isActive": true
    }
  }
}
```

## Error Cases

Missing token:

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

Invalid token:

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

Non-admin user:

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

Suspended admin:

```json
{
  "success": false,
  "code": "ACCOUNT_SUSPENDED",
  "message": "Account is suspended"
}
```

Inactive admin:

```json
{
  "success": false,
  "code": "ACCOUNT_INACTIVE",
  "message": "Account is inactive"
}
```

Missing token user:

```json
{
  "success": false,
  "code": "USER_NOT_FOUND",
  "message": "User not found"
}
```

Invalid `reportId`:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reportId must be a valid id"
}
```

Report not found:

```http
404 Not Found
```

```json
{
  "success": false,
  "code": "REPORT_NOT_FOUND",
  "message": "Report not found"
}
```

Report is not open:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "REPORT_NOT_OPEN",
  "message": "Only open reports can be reviewed"
}
```

Missing status:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "status is required"
}
```

Invalid status:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid status: BAD"
}
```

`OPEN` status is not accepted:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid status: OPEN"
}
```

Missing review note for `DISMISSED` or `ACTION_TAKEN`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reviewNote is required"
}
```

Review note too long:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reviewNote must be at most 1000 characters"
}
```

Body is not an object:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "body must be an object"
}
```

Invalid JSON:

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

## Tested Checklist

Automated smoke test covered:

- `REVIEWED` success
- `DISMISSED` success with `reviewNote`
- `ACTION_TAKEN` success with `reviewNote`
- notification creation for each success status
- notification metadata
- enriched response shape
- missing `status`
- invalid `status`
- `OPEN` rejected as an update target
- missing `reviewNote` for `DISMISSED`
- missing `reviewNote` for `ACTION_TAKEN`
- `reviewNote` over 1000 characters
- body not object
- invalid `reportId`
- report not found
- report already reviewed / not open

Postman test covered:

- owner login
- `REVIEWED` success
- `DISMISSED` success
- `ACTION_TAKEN` success
- `REPORT_NOT_OPEN`
- invalid `reportId`
- report not found
- missing `status`
- invalid `status`
- `OPEN` rejected
- `DISMISSED` missing `reviewNote`
- `ACTION_TAKEN` missing `reviewNote`
- `reviewNote` too long
- body must be object
- invalid JSON
- missing token
- malformed bearer
- invalid token
- non-admin forbidden
- suspended admin
- inactive admin
- missing/deleted admin user

## Implementation Notes

Backend files:

```txt
modules/report/admin-report.routes.js
modules/report/controllers/admin-update-report-status.controller.js
modules/report/services/admin-update-report-status.service.js
modules/report/report.validation.js
modules/report/utils/admin-report-aggregation.js
```

The service returns the same enriched detail shape as:

```http
GET /api/v1/admin/reports/:reportId
```

This keeps admin report list, detail, and status update responses consistent.
