# Create Review Report

Report a lister review for admin moderation.

This endpoint is authenticated. Only an active user can create a review report.

## Endpoint

```http
POST /api/v1/review-reports
```

Full local URL:

```http
POST http://localhost:3000/api/v1/review-reports
```

## Headers

```http
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

## Request Body

```json
{
  "reviewId": "6a5a7ceb6fa6418a464839c2",
  "reason": "SPAM",
  "note": "Postman review report test."
}
```

Fields:

```txt
reviewId  required, valid lister review id
reason    required, allowed review report reason
note      optional, string, max 1000 characters
```

Allowed `reason` values:

```txt
INAPPROPRIATE_LANGUAGE
HARASSMENT_OR_HATE
FALSE_INFORMATION
SPAM
PRIVATE_INFORMATION
CONFLICT_OF_INTEREST
OTHER
```

Empty `note` values are normalized to `null`.

## Business Rules

The backend always uses the authenticated user as `reportedBy`.

Create is allowed only when:

- reporter user exists
- reporter user status is `ACTIVE`
- target review exists
- target review is not deleted
- reporter is not the owner of the target review
- reporter does not already have an open, non-deleted report for the same review

New reports are created with:

```json
{
  "status": "OPEN",
  "reviewedBy": null,
  "reviewedAt": null,
  "reviewNote": null,
  "actionTakenBy": null,
  "actionTakenAt": null,
  "actionReason": null,
  "isDeleted": false,
  "deletedAt": null
}
```

Duplicate open reports are protected by both:

- service-level pre-check for a friendly error
- partial unique index on `reviewId + reportedBy` where `status: "OPEN"` and `isDeleted: false`

## Success Output

Status:

```http
201 Created
```

Body:

```json
{
  "success": true,
  "data": {
    "_id": "6a5b046d1d6f2148addbfda1",
    "reviewId": "6a5a7ceb6fa6418a464839c2",
    "listerProfileId": "6a5669f81a9630e315e059a7",
    "reviewOwnerId": "6a567af318a65af44ed99cde",
    "reportedBy": "6a566f7d466cac8bca4ed53e",
    "reason": "SPAM",
    "note": null,
    "status": "OPEN",
    "reviewedBy": null,
    "reviewedAt": null,
    "reviewNote": null,
    "actionTakenBy": null,
    "actionTakenAt": null,
    "actionReason": null,
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-07-18T04:43:25.424Z",
    "updatedAt": "2026-07-18T04:43:25.424Z"
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

Reporter user not found:

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

Reporter suspended:

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

Reporter inactive:

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

Review not found or deleted:

```http
404 Not Found
```

```json
{
  "success": false,
  "code": "REVIEW_NOT_FOUND",
  "message": "Review not found"
}
```

Reporter owns the review:

```http
403 Forbidden
```

```json
{
  "success": false,
  "code": "REVIEW_REPORT_SELF_NOT_ALLOWED",
  "message": "You cannot report your own review"
}
```

Duplicate open report:

```http
409 Conflict
```

```json
{
  "success": false,
  "code": "REVIEW_REPORT_ALREADY_EXISTS",
  "message": "You already have an open report for this review"
}
```

## Validation Errors

Invalid or missing `reviewId`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reviewId must be a valid id"
}
```

Missing `reason`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reason is required"
}
```

Invalid `reason`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid reason: BAD_REASON"
}
```

Long `note`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "note must be at most 1000 characters"
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

```json
{
  "success": false,
  "code": "INVALID_JSON",
  "message": "Request body must be valid JSON"
}
```

## Tested Checklist

- create report returns `201`
- open duplicate returns `REVIEW_REPORT_ALREADY_EXISTS`
- review owner cannot report their own review
- invalid `reviewId`
- missing `reviewId`
- invalid `reason`
- missing `reason`
- long `note`
- empty `note` becomes `null`
- body must be an object
- invalid JSON
- non-existing review returns `REVIEW_NOT_FOUND`
- deleted review returns `REVIEW_NOT_FOUND`
- missing token
- malformed auth header
- invalid token
- valid token for missing user
- suspended reporter
- inactive reporter
- created Postman test reports were soft-deleted after testing
