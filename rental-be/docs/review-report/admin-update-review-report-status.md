# Admin Update Review Report Status

Review and close one open review report.

This endpoint is admin-only. It lets an `OWNER` or `ADMIN` mark an open review report as reviewed, dismissed, or action taken. The response returns the enriched review report detail.

## Endpoint

```http
PATCH /api/v1/admin/review-reports/:reviewReportId/status
```

Full local URL:

```http
PATCH http://localhost:3000/api/v1/admin/review-reports/6a5b8f643f3e9321591484bc/status
```

## Headers

```http
Authorization: Bearer OWNER_OR_ADMIN_ACCESS_TOKEN
Content-Type: application/json
```

## Path Params

```txt
reviewReportId  required, valid review report id
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
  "reviewNote": "No policy issue found."
}
```

Take action:

```json
{
  "status": "ACTION_TAKEN",
  "reviewNote": "Review was removed."
}
```

Fields:

```txt
status      required, one of REVIEWED, DISMISSED, ACTION_TAKEN
reviewNote  optional for REVIEWED, required for DISMISSED and ACTION_TAKEN, max 1000 characters
```

`OPEN` is not accepted as an update target. New reports start as `OPEN`; this endpoint closes an open report into a reviewed state.

## Auth Rules

Request is allowed only when:

- token is valid
- token user exists
- token user status is `ACTIVE`
- token user role is `OWNER` or `ADMIN`

## Business Rules

Only open, non-deleted review reports can be updated:

```js
{
  _id: reviewReportId,
  isDeleted: false,
  status: "OPEN"
}
```

Missing or deleted reports return `REVIEW_REPORT_NOT_FOUND`.

Reports that already have a non-`OPEN` status return `REVIEW_REPORT_NOT_OPEN`.

The update is atomic. The backend first confirms the report exists and is open, then updates with a guarded `findOneAndUpdate` that still requires `status: "OPEN"`. This protects against two admins reviewing the same report at the same time.

## Status Effects

`REVIEWED`:

```json
{
  "status": "REVIEWED",
  "reviewedBy": "OWNER_OR_ADMIN_USER_ID",
  "reviewedAt": "now",
  "reviewNote": null,
  "actionTakenBy": null,
  "actionTakenAt": null,
  "actionReason": null
}
```

`DISMISSED`:

```json
{
  "status": "DISMISSED",
  "reviewedBy": "OWNER_OR_ADMIN_USER_ID",
  "reviewedAt": "now",
  "reviewNote": "No policy issue found.",
  "actionTakenBy": null,
  "actionTakenAt": null,
  "actionReason": null
}
```

`ACTION_TAKEN`:

```json
{
  "status": "ACTION_TAKEN",
  "reviewedBy": "OWNER_OR_ADMIN_USER_ID",
  "reviewedAt": "now",
  "reviewNote": "Review was removed.",
  "actionTakenBy": "OWNER_OR_ADMIN_USER_ID",
  "actionTakenAt": "now",
  "actionReason": "Review was removed."
}
```

## Notifications

The reporter receives one notification after the report is reviewed.

Notification creation happens inside the transaction. Socket emission happens only after the transaction commits.

Notification copy is intentionally simple and user-friendly:

```txt
REVIEWED      We reviewed your report about ...
DISMISSED     We reviewed your report about ... and did not find a policy issue.
ACTION_TAKEN  We reviewed your report about ... and took action.
```

When `reviewNote` is present, only the first non-empty line is included in the public notification metadata and message.

Notification metadata:

```json
{
  "reviewReportId": "6a5b8f643f3e9321591484bc",
  "reviewId": "6a5a7ceb6fa6418a464839c2",
  "listerProfileId": "6a5669f81a9630e315e059a7",
  "reviewOwnerId": "6a567af318a65af44ed99cde",
  "reason": "No policy issue found."
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
    "_id": "6a5b8fd32fdfb95418aafa36",
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
    "note": "TEMP Postman admin update review-report status ACTION_TAKEN test",
    "status": "ACTION_TAKEN",
    "reviewedBy": {
      "_id": "6a5638c8fc6d6328c9e1b282",
      "name": "Test Owner User",
      "email": "test.owner.user@example.com",
      "role": "OWNER",
      "status": "ACTIVE"
    },
    "reviewedAt": "2026-07-18T14:38:29.282Z",
    "reviewNote": "Review was removed.",
    "actionTakenBy": {
      "_id": "6a5638c8fc6d6328c9e1b282",
      "name": "Test Owner User",
      "email": "test.owner.user@example.com",
      "role": "OWNER",
      "status": "ACTIVE"
    },
    "actionTakenAt": "2026-07-18T14:38:29.282Z",
    "actionReason": "Review was removed.",
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-07-18T14:38:11.185Z",
    "updatedAt": "2026-07-18T14:38:29.282Z",
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

Review report is already closed:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "REVIEW_REPORT_NOT_OPEN",
  "message": "Only open review reports can be reviewed"
}
```

## Validation Errors

Invalid `reviewReportId`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reviewReportId must be a valid id"
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

Missing `status`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "status is required"
}
```

Invalid `status`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid status: BAD"
}
```

`OPEN` rejected:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid status: OPEN"
}
```

Missing `reviewNote` for `DISMISSED` or `ACTION_TAKEN`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reviewNote is required"
}
```

`reviewNote` too long:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reviewNote must be at most 1000 characters"
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

## Implementation Notes

The service uses:

```txt
adminUpdateReviewReportStatusService
validateAdminUpdateReviewReportStatusBody
adminGetReviewReportByIdService
```

The update flow is:

```txt
validate path/body/actor
start transaction
load non-deleted open report
atomic update guarded by status OPEN
create reporter notification inside transaction
commit transaction
emit notification socket event
return enriched admin detail
```

The endpoint reuses the admin detail lookup for its response, so the returned shape matches `GET /api/v1/admin/review-reports/:reviewReportId`.

## Index

The guarded update benefits from the admin queue index:

```js
{
  isDeleted: 1,
  status: 1,
  createdAt: -1,
  _id: 1
}
```

MongoDB can also use the default `_id` index for the single-report update. The explicit `status: "OPEN"` condition is still important for concurrency safety.

## Tested Checklist

- `REVIEWED` success
- `DISMISSED` success
- `ACTION_TAKEN` success
- enriched response includes reporter, review owner, lister profile, and review
- notification created for each success status
- notification copy has no double punctuation
- invalid `reviewReportId`
- body must be object
- missing `status`
- invalid `status`
- `OPEN` rejected
- missing `reviewNote` for `DISMISSED`
- missing `reviewNote` for `ACTION_TAKEN`
- `reviewNote` too long
- report not found
- deleted report returns `REVIEW_REPORT_NOT_FOUND`
- non-open report returns `REVIEW_REPORT_NOT_OPEN`
- invalid JSON
- missing token
- malformed auth header
- invalid token
- valid token for missing user
- non-admin user forbidden
- suspended admin
- inactive admin
- temporary Postman reports were soft-deleted after testing
- temporary Postman notifications were removed after testing
