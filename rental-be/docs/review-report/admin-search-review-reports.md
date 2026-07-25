# Admin Search Review Reports

List review reports for admin moderation.

This endpoint is admin-only. It returns paginated review reports with reporter, review owner, lister profile, and original review context.

## Endpoint

```http
GET /api/v1/admin/review-reports
```

Full local URL:

```http
GET http://localhost:3000/api/v1/admin/review-reports
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
GET /api/v1/admin/review-reports?page=1&limit=20
GET /api/v1/admin/review-reports?status=OPEN&page=1&limit=20
GET /api/v1/admin/review-reports?status=ACTION_TAKEN&page=1&limit=20
```

## Auth Rules

Request is allowed only when:

- token is valid
- token user exists
- token user status is `ACTIVE`
- token user role is `OWNER` or `ADMIN`

## Business Rules

Only non-deleted review reports are returned:

```js
{
  isDeleted: false
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

The backend filters, sorts, skips, and limits before running lookup enrichment. This keeps admin listing efficient because only the current page is enriched.

## Lookup Context

Each returned report can include:

```txt
reportedBy     user who submitted the report
reviewOwner    user who wrote the reported review
reviewedBy     admin/owner who reviewed the report, if processed
actionTakenBy  admin/owner who took action, if applicable
listerProfile  lister profile attached to the reported review
review         original lister review content
```

User lookup projection:

```json
{
  "_id": "...",
  "name": "Test Owner User",
  "email": "test.owner.user@example.com",
  "role": "OWNER",
  "status": "ACTIVE"
}
```

Lister profile lookup includes `isOnline` and does not return obsolete `isActive`.

Original review lookup does not return obsolete `status`; lister reviews use `isDeleted` and `visibility.isCollapsed` for lifecycle/display state.

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
      "_id": "6a5b7ddb11104fd4aae2ad1c",
      "reviewId": "6a5a7ceb6fa6418a464839c2",
      "listerProfileId": "6a5669f81a9630e315e059a7",
      "reviewOwnerId": "6a567af318a65af44ed99cde",
      "reportedBy": {
        "_id": "6a566f7d466cac8bca4ed53e",
        "name": "Line Only Agent User",
        "email": "line.only.agent.user@example.com",
        "role": "USER",
        "status": "ACTIVE"
      },
      "reason": "SPAM",
      "note": "TEMP Postman admin review-report list test OPEN",
      "status": "OPEN",
      "reviewedAt": null,
      "reviewNote": null,
      "actionTakenAt": null,
      "actionReason": null,
      "isDeleted": false,
      "deletedAt": null,
      "createdAt": "2026-07-18T13:21:31.588Z",
      "updatedAt": "2026-07-18T13:21:31.588Z",
      "reviewOwner": {
        "_id": "6a567af318a65af44ed99cde",
        "name": "No Agent Profile User",
        "email": "no.agent.profile.user@example.com",
        "role": "USER",
        "status": "ACTIVE"
      },
      "listerProfile": {
        "_id": "6a5669f81a9630e315e059a7",
        "userId": "6a5638bafc6d6328c9e1b281",
        "displayName": "Patch Restored Agent",
        "profilePhoto": null,
        "supportLanguages": ["English", "Thai"],
        "isVerified": false,
        "isDeleted": false,
        "isOnline": true,
        "reviewSummary": {
          "averageRating": 5,
          "reviewCount": 1,
          "ratingCounts": {
            "oneStar": 0,
            "twoStars": 0,
            "threeStars": 0,
            "fourStars": 0,
            "fiveStars": 1
          },
          "tagCounts": [
            {
              "tag": "HELPFUL",
              "count": 1
            }
          ]
        }
      },
      "review": {
        "_id": "6a5a7ceb6fa6418a464839c2",
        "reviewerId": "6a567af318a65af44ed99cde",
        "listerProfileId": "6a5669f81a9630e315e059a7",
        "relatedListingId": null,
        "relatedBuildingId": null,
        "rating": 5,
        "tags": ["HELPFUL", "RESPONSIVE"],
        "comment": "Postman create review test.",
        "visibility": {
          "isCollapsed": false,
          "collapsedBy": null,
          "collapsedAt": null,
          "collapseReason": null
        },
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2026-07-17T19:05:15.066Z",
        "updatedAt": "2026-07-18T04:41:18.935Z"
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
    "page": 3,
    "limit": 2,
    "total": 4
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

Admin queue query uses this index:

```js
{
  isDeleted: 1,
  status: 1,
  createdAt: -1,
  _id: 1
}
```

This supports:

- non-deleted report filtering
- status filtering
- newest-first pagination

## Tested Checklist

- default list returns `200`
- empty baseline returns `data: []` with `total: 0`
- seeded list returns four reports
- `status=OPEN`
- `status=REVIEWED`
- `status=DISMISSED`
- `status=ACTION_TAKEN`
- pagination page 1 with `limit=2`
- empty high page
- invalid `status`
- invalid `page`
- invalid `limit`
- non-numeric `limit`
- missing token
- malformed auth header
- invalid token
- valid token for missing user
- non-admin user forbidden
- suspended admin
- inactive admin
- lookup includes `listerProfile.isOnline`
- lookup excludes obsolete `listerProfile.isActive`
- lookup excludes obsolete `review.status`
- temporary Postman reports were soft-deleted after testing
