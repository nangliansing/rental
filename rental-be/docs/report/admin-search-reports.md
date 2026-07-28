# Admin Search Listing Reports

List listing reports for admin moderation.

This endpoint is admin-only. It returns paginated listing reports with reporter, listing, listing owner, agent profile, building, and reviewer context.

Embedded `listing` objects include `availableAt`. See [`../listing/available-at-response.md`](../listing/available-at-response.md).

## Endpoint

```http
GET /api/v1/admin/reports
```

Full local URL:

```http
GET http://localhost:3000/api/v1/admin/reports
```

## Headers

```http
Authorization: Bearer OWNER_OR_ADMIN_ACCESS_TOKEN
```

## Query Params

```txt
status  optional, one of OPEN, REVIEWED, DISMISSED, ACTION_TAKEN
page    optional, integer, 1 to 10000, default 1
limit   optional, integer, 1 to 100, default 20
```

Examples:

```http
GET /api/v1/admin/reports?page=1&limit=20
GET /api/v1/admin/reports?status=OPEN&page=1&limit=20
GET /api/v1/admin/reports?status=ACTION_TAKEN&page=1&limit=20
```

## Auth Rules

Request is allowed only when:

- token is valid
- token user exists
- token user status is `ACTIVE`
- token user role is `OWNER` or `ADMIN`

## Business Rules

Only listing reports are returned:

```js
{
  targetType: "LISTING"
}
```

When `status` is provided, the backend also filters by that status.

Reports are sorted newest first:

```js
{
  createdAt: -1,
  _id: 1
}
```

The backend filters, sorts, skips, and limits before running lookup enrichment. This keeps the admin listing efficient because only the current page is enriched.

## Lookup Context

Each returned report can include:

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

Missing lookup targets are preserved as empty fields instead of dropping the report. This allows admins to review historical reports even if a related user, listing, agent profile, or building has been removed.

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
        "availableAt": "2026-08-14T17:00:00.000Z",
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
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

Empty result:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 2,
    "limit": 1,
    "total": 1
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

## Validation Errors

Invalid `status`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid status: BAD"
}
```

Invalid `page`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "page must be between 1 and 10000"
}
```

Invalid `limit`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "limit must be between 1 and 100"
}
```

Non-numeric `limit`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "limit must be a number"
}
```

## Index

Admin report queue query uses this index:

```js
{
  targetType: 1,
  status: 1,
  createdAt: -1,
  _id: 1
}
```

This supports:

- listing-report filtering
- status filtering
- newest-first pagination

## Tested Checklist

Automated coverage completed:

- OWNER can list reports
- ADMIN can list reports
- status filter returns `OPEN` reports
- status filter returns `ACTION_TAKEN` reports
- pagination can return an empty page with preserved `total`
- joined response includes reporter, listing, listing owner, agent profile, building, and reviewer
- `listingAgentProfile.isOnline` returns as a boolean
- invalid `status`
- invalid `page`
- invalid `limit`
- non-numeric `limit`
- missing token
- malformed auth header
- invalid token
- non-admin user forbidden
- suspended admin
- inactive admin
- deleted token user
- temporary automated fixtures were hard-deleted after testing

Postman coverage completed:

- OWNER login
- default list returns the open listing report
- `status=OPEN`
- empty result with `status=REVIEWED`
- pagination empty page with preserved `total`
- invalid `status`
- invalid `page`
- invalid `limit`
- non-numeric `limit`
- missing token
- malformed bearer token
- invalid token
- non-admin user forbidden
- suspended admin
- inactive admin
- deleted token user
- test admin account was restored to `ACTIVE`
