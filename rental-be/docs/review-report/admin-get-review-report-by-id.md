# Admin Get Review Report By Id

Get one review report for admin moderation.

This endpoint is admin-only. It returns a single non-deleted review report enriched with reporter, review owner, lister profile, and original review context.

## Endpoint

```http
GET /api/v1/admin/review-reports/:reviewReportId
```

Full local URL:

```http
GET http://localhost:3000/api/v1/admin/review-reports/6a5b87c2e5c7e0c285c1be6b
```

## Headers

```http
Authorization: Bearer OWNER_OR_ADMIN_ACCESS_TOKEN
```

## Path Params

```txt
reviewReportId  required, valid review report id
```

## Auth Rules

Request is allowed only when:

- token is valid
- token user exists
- token user status is `ACTIVE`
- token user role is `OWNER` or `ADMIN`

## Business Rules

Only non-deleted review reports can be returned:

```js
{
  _id: reviewReportId,
  isDeleted: false
}
```

Deleted or missing reports return the same `REVIEW_REPORT_NOT_FOUND` error. This avoids exposing whether a deleted moderation record exists.

## Lookup Context

The returned report can include:

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
  "data": {
    "_id": "6a5b87c2e5c7e0c285c1be6b",
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
    "note": "TEMP Postman admin review-report detail test",
    "status": "OPEN",
    "reviewedAt": null,
    "reviewNote": null,
    "actionTakenAt": null,
    "actionReason": null,
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-07-18T14:03:46.457Z",
    "updatedAt": "2026-07-18T14:03:46.457Z",
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
      "isDeleted": false,
      "displayName": "Patch Restored Agent",
      "profilePhoto": null,
      "supportLanguages": ["English", "Thai"],
      "isVerified": false,
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
      "moderation": {
        "hiddenBy": null,
        "hiddenAt": null,
        "hiddenReason": null,
        "removedBy": null,
        "removedAt": null,
        "removedReason": null
      },
      "editedAt": "2026-07-17T19:59:17.754Z",
      "isDeleted": false,
      "deletedAt": null,
      "visibility": {
        "isCollapsed": false,
        "collapsedBy": null,
        "collapsedAt": null,
        "collapseReason": null
      },
      "createdAt": "2026-07-17T19:05:15.066Z",
      "updatedAt": "2026-07-18T04:41:18.935Z"
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

Review report not found or deleted:

```http
404 Not Found
```

```json
{
  "success": false,
  "code": "REVIEW_REPORT_NOT_FOUND",
  "message": "Review report not found"
}
```

## Validation Errors

Invalid `reviewReportId`:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reviewReportId must be a valid id"
}
```

## Implementation Notes

The service validates the id, then uses the shared admin review-report lookup pipeline:

```txt
adminGetReviewReportByIdService
buildAdminReviewReportDetailPipeline
buildAdminReviewReportLookupStages
```

The detail pipeline does:

```js
[
  {
    $match: {
      _id: reviewReportId,
      isDeleted: false
    }
  },
  { $limit: 1 },
  ...buildAdminReviewReportLookupStages()
]
```

No separate custom index is needed for the detail lookup because MongoDB uses the default `_id` index first, then checks `isDeleted: false` on the matched document.

## Tested Checklist

- success detail returns `200`
- invalid `reviewReportId`
- non-existing report
- soft-deleted report returns `REVIEW_REPORT_NOT_FOUND`
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
- temporary Postman report was soft-deleted after testing
