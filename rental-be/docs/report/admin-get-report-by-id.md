# Admin Get Listing Report By Id

Get one listing report for admin moderation.

This endpoint is admin-only. It returns a single listing report enriched with reporter, listing, listing owner, agent profile, building, and reviewer context.

## Endpoint

```http
GET /api/v1/admin/reports/:reportId
```

Full local URL:

```http
GET http://localhost:3000/api/v1/admin/reports/6a5bbf8509d1a654729c7d21
```

## Headers

```http
Authorization: Bearer OWNER_OR_ADMIN_ACCESS_TOKEN
```

## Path Params

```txt
reportId  required, valid report id
```

## Auth Rules

Request is allowed only when:

- token is valid
- token user exists
- token user status is `ACTIVE`
- token user role is `OWNER` or `ADMIN`

## Business Rules

Only listing reports can be returned:

```js
{
  _id: reportId,
  targetType: "LISTING"
}
```

Missing reports return `REPORT_NOT_FOUND`.

## Lookup Context

The returned report can include:

```txt
reportedBy           user who submitted the listing report
listing              reported listing snapshot
listingOwner         user who owns the reported listing
listingAgentProfile  agent profile for the listing owner, if present
building             building attached to the listing
reviewedBy           admin/owner who reviewed the report, if processed
```

User lookup projection:

```json
{
  "_id": "6a566f7d466cac8bca4ed53e",
  "name": "Line Only Agent User",
  "email": "line.only.agent.user@example.com",
  "role": "USER",
  "status": "ACTIVE"
}
```

Agent profile lookup includes `isOnline` and does not return obsolete `isActive`.

## Missing Lookup Targets

Lookup targets are optional historical context.

The aggregation uses:

```js
{
  $unwind: {
    path: "$field",
    preserveNullAndEmptyArrays: true
  }
}
```

This means the report is still returned when any related lookup target is missing.

Clients should treat these enriched fields as nullable or optional:

```txt
reportedBy
listing
listingOwner
listingAgentProfile
building
reviewedBy
```

This is intentional. Admins should still be able to review historical moderation records even if a related user, listing, agent profile, or building has been removed.

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
    "_id": "6a5bbf8509d1a654729c7d21",
    "targetType": "LISTING",
    "listingId": "6a57d0e4947d934e03495b84",
    "reportedBy": {
      "_id": "6a566f7d466cac8bca4ed53e",
      "name": "Line Only Agent User",
      "email": "line.only.agent.user@example.com",
      "role": "USER",
      "status": "ACTIVE"
    },
    "reason": "WRONG_PRICE",
    "note": "Postman create listing report test.",
    "status": "OPEN",
    "reviewedAt": null,
    "reviewNote": null,
    "createdAt": "2026-07-18T18:01:41.598Z",
    "updatedAt": "2026-07-18T18:01:41.598Z",
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

Token user not found:

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

Suspended admin:

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

Inactive admin:

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

## Validation Errors

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

## Implementation Notes

The service validates the id, then uses the shared admin report detail pipeline:

```txt
adminGetReportByIdService
buildAdminReportDetailPipeline
buildAdminReportLookupStages
```

The detail pipeline does:

```js
[
  {
    $match: {
      _id: reportId,
      targetType: "LISTING"
    }
  },
  { $limit: 1 },
  ...buildAdminReportLookupStages()
]
```

No separate custom index is needed for the detail lookup because MongoDB uses the default `_id` index first, then checks `targetType: "LISTING"` on the matched document.

## Tested Checklist

Automated coverage completed:

- OWNER can get report detail
- ADMIN can get report detail
- success response includes reporter, listing, listing owner, agent profile, building
- `listingAgentProfile.isOnline` returns as a boolean
- invalid `reportId`
- valid-format missing report
- missing token
- malformed bearer token
- invalid token
- non-admin user forbidden
- suspended admin
- inactive admin
- deleted token user
- temporary automated users were hard-deleted after testing

Postman coverage completed:

- happy path detail with full lookup context
- invalid `reportId`
- valid-format missing report
- missing token
- malformed bearer token
- invalid token
- non-admin user forbidden
- suspended admin
- inactive admin
- deleted token user
- test admin account was restored to `ACTIVE`
