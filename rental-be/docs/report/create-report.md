# Create Listing Report

Report a public listing for admin review.

This endpoint is authenticated. Only an active user can create a listing report.

## Endpoint

```http
POST /api/v1/reports
```

Full local URL:

```http
POST http://localhost:3000/api/v1/reports
```

## Headers

```http
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

## Request Body

```json
{
  "listingId": "6a57d0e4947d934e03495b84",
  "reason": "WRONG_PRICE",
  "note": "Postman create listing report test."
}
```

Fields:

```txt
listingId  required, valid listing id
reason     required, allowed listing report reason
note       optional, string, max 1000 characters
```

Allowed `reason` values:

```txt
WRONG_PRICE
UNAVAILABLE
MISLEADING_PHOTOS
WRONG_BUILDING_OR_LOCATION
SUSPICIOUS_CONTACT
UNRESPONSIVE_LISTER
FAKE_OR_SUSPICIOUS_LISTER
DUPLICATE_LISTING
INAPPROPRIATE_CONTENT
UNAUTHORIZED_PHOTOS
HATE_OR_HARASSMENT
OTHER
```

Empty `note` values are normalized to `null`.

## Business Rules

The backend always uses the authenticated user as `reportedBy`.

Create is allowed only when:

- reporter user exists
- reporter user status is `ACTIVE`
- target listing exists
- target listing is not deleted
- reporter does not already have an open report for the same listing

New reports are created with:

```json
{
  "targetType": "LISTING",
  "status": "OPEN",
  "reviewedBy": null,
  "reviewedAt": null,
  "reviewNote": null
}
```

## Duplicate Rule

A user can have only one open report for the same listing.

Duplicate open reports are protected by a partial unique index on:

```txt
targetType + listingId + reportedBy + status
```

where:

```json
{
  "targetType": "LISTING",
  "status": "OPEN"
}
```

When a duplicate open report is attempted, the API returns `409 REPORT_ALREADY_OPEN`.

## Listing Visibility And Deleted Rule

The create flow checks listing existence with:

```js
{
  _id: listingId,
  isDeleted: { $ne: true }
}
```

Deleted listings are intentionally hidden as not found. The endpoint returns the same `LISTING_NOT_FOUND` response for both:

- listing id does not exist
- listing exists but `isDeleted: true`

This prevents clients from learning whether a deleted listing used to exist.

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
    "_id": "6a5bbf8509d1a654729c7d21",
    "targetType": "LISTING",
    "listingId": "6a57d0e4947d934e03495b84",
    "reportedBy": "6a566f7d466cac8bca4ed53e",
    "reason": "WRONG_PRICE",
    "note": "Postman create listing report test.",
    "status": "OPEN",
    "reviewedBy": null,
    "reviewedAt": null,
    "reviewNote": null,
    "createdAt": "2026-07-18T18:01:41.598Z",
    "updatedAt": "2026-07-18T18:01:41.598Z"
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

Listing not found or deleted:

```http
404 Not Found
```

```json
{
  "success": false,
  "code": "LISTING_NOT_FOUND",
  "message": "Listing not found"
}
```

Duplicate open report:

```http
409 Conflict
```

```json
{
  "success": false,
  "code": "REPORT_ALREADY_OPEN",
  "message": "You already have an open report for this listing"
}
```

Invalid `listingId`:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "listingId must be a valid id"
}
```

Missing `reason`:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reason is required"
}
```

Invalid `reason`:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid reason: BAD_REASON"
}
```

Note too long:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "note must be at most 1000 characters"
}
```

Body is not an object:

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

Postman coverage completed:

- `201` creates an open listing report
- authenticated user is used as `reportedBy`
- duplicate open report returns `409 REPORT_ALREADY_OPEN`
- invalid `listingId` returns validation error
- valid-format missing listing id returns `LISTING_NOT_FOUND`
- deleted listing returns `LISTING_NOT_FOUND`
- invalid `reason` returns validation error
- missing `reason` returns validation error
- `note` over 1000 characters returns validation error
- array body returns `body must be an object`
- malformed JSON returns `INVALID_JSON`
- missing token returns `ACCESS_TOKEN_REQUIRED`
- malformed bearer token returns `ACCESS_TOKEN_REQUIRED`
- invalid token returns `INVALID_ACCESS_TOKEN`
- suspended user returns `ACCOUNT_SUSPENDED`
- inactive user returns `ACCOUNT_INACTIVE`
- deleted token user returns `USER_NOT_FOUND`

Automated smoke coverage also passed for the same cases, including temporary fixture cleanup.
