# Toggle Lister Review Collapse

Collapse or uncollapse a review on the authenticated user's own lister profile.

This endpoint is authenticated. Only the lister profile owner can collapse or uncollapse reviews on their profile.

## Endpoint

```http
PATCH /api/v1/lister-reviews/:reviewId/toggle-collapse
```

Full local URL:

```http
PATCH http://localhost:3000/api/v1/lister-reviews/:reviewId/toggle-collapse
```

Example:

```http
PATCH http://localhost:3000/api/v1/lister-reviews/6a5a7ceb6fa6418a464839c2/toggle-collapse
```

## Headers

```http
Authorization: Bearer ACCESS_TOKEN
```

Do not send a request body.

## Path Params

```txt
reviewId  required, valid lister review id
```

## Business Rules

The backend always uses the authenticated user as the lister profile owner.

Toggle is allowed only when:

- actor user exists
- actor user status is `ACTIVE`
- review exists
- review is not deleted
- review belongs to an agent profile owned by the authenticated user
- agent profile is not deleted

Collapse behavior:

- if review is currently visible, set `visibility.isCollapsed: true`
- set `visibility.collapsedBy` to the authenticated user's id
- set `visibility.collapsedAt` to the current time
- set `visibility.collapseReason` to `null`

Uncollapse behavior:

- if review is currently collapsed, set `visibility.isCollapsed: false`
- clear `visibility.collapsedBy`
- clear `visibility.collapsedAt`
- clear `visibility.collapseReason`

Review lifecycle is simple:

- `visibility.isCollapsed` is display state only
- collapsed reviews are still active reviews
- collapsed reviews still count in `reviewSummary`
- this endpoint does not recalculate `reviewSummary`
- there is no review `status` field

No new index is required for this endpoint because the review lookup starts from `_id`, then applies `listerProfileId` and `isDeleted` guards.

## Success Output

Status:

```http
200 OK
```

Collapsed body:

```json
{
  "success": true,
  "data": {
    "_id": "6a5a7ceb6fa6418a464839c2",
    "reviewerId": "6a567af318a65af44ed99cde",
    "listerProfileId": "6a5669f81a9630e315e059a7",
    "relatedListingId": null,
    "relatedBuildingId": null,
    "rating": 5,
    "tags": ["HELPFUL", "RESPONSIVE"],
    "comment": "Postman create review test.",
    "interaction": {
      "isVerified": false,
      "verifiedBy": null,
      "contactEventId": null,
      "verifiedAt": null
    },
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
      "isCollapsed": true,
      "collapsedBy": "6a5638bafc6d6328c9e1b281",
      "collapsedAt": "2026-07-17T21:00:11.770Z",
      "collapseReason": null
    },
    "createdAt": "2026-07-17T19:05:15.066Z",
    "updatedAt": "2026-07-17T21:00:11.772Z"
  }
}
```

Uncollapsed visibility:

```json
{
  "visibility": {
    "isCollapsed": false,
    "collapsedBy": null,
    "collapsedAt": null,
    "collapseReason": null
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

Suspended actor:

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

Inactive actor:

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

Invalid `reviewId`:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reviewId must be a valid id"
}
```

Review not found or deleted:

```http
404 Not Found
```

```json
{
  "success": false,
  "code": "LISTER_REVIEW_NOT_FOUND",
  "message": "Review not found"
}
```

Wrong profile owner or deleted lister profile:

```http
403 Forbidden
```

```json
{
  "success": false,
  "code": "LISTER_REVIEW_OWNER_REQUIRED",
  "message": "You can only collapse reviews on your own profile"
}
```

## Tested Checklist

- active profile owner can collapse visible review
- collapse sets `visibility.isCollapsed: true`
- collapse sets `visibility.collapsedBy`
- collapse sets `visibility.collapsedAt`
- collapse leaves `visibility.collapseReason: null`
- active profile owner can uncollapse same review
- uncollapse clears `collapsedBy`, `collapsedAt`, and `collapseReason`
- wrong profile owner cannot toggle
- invalid `reviewId`
- unknown review
- missing token
- malformed bearer token
- invalid token
- suspended actor
- inactive actor
- token user not found
- deleted review
- deleted lister profile
- final restore confirmed review is uncollapsed
- `reviewSummary` stays unchanged
- no `status` field is returned
