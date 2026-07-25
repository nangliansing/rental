# Admin Remove Lister Review

Soft-delete a lister review as a platform moderator, recalculate the affected lister's review summary, and notify the review author when that account still exists.

## Endpoint

```http
DELETE /api/v1/admin/reviews/:reviewId
```

Local example:

```http
DELETE http://localhost:3000/api/v1/admin/reviews/6a5d9534e5cb5681182ef64e
```

## Authorization

Requires an access token for an active `OWNER` or `ADMIN` user:

```http
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

The shared admin router applies:

```txt
authenticate
requireActiveUser
authorizeRoles(OWNER, ADMIN)
```

The caller is reloaded from the database before authorization. A token belonging to a suspended, inactive, or missing user cannot perform moderation.

## Path Parameters

| Name | Required | Validation |
| --- | --- | --- |
| `reviewId` | yes | Valid MongoDB ObjectId |

## Query Parameters

None.

## Request Body

The body must be a JSON object containing a moderation reason:

```json
{
  "reason": "Contains prohibited content."
}
```

Reason rules:

- required
- string
- surrounding whitespace is removed
- cannot be blank after trimming
- maximum 500 characters

The client cannot provide `removedBy`, `removedAt`, deletion fields, or review-summary values.

## Review Eligibility

The service atomically matches:

```js
{
  _id: reviewId,
  isDeleted: false
}
```

The following cases return the same `LISTER_REVIEW_NOT_FOUND` response:

- the review does not exist
- the review is already soft-deleted
- another request deleted it first

A repeated DELETE request therefore returns `404`.

## Soft-Delete Behavior

The review remains stored and receives the following moderation state:

```js
{
  isDeleted: true,
  deletedAt: currentDate,
  "moderation.removedBy": currentAdminId,
  "moderation.removedAt": currentDate,
  "moderation.removedReason": validatedReason
}
```

`deletedAt` and `moderation.removedAt` use the same timestamp. Existing review content remains available to administrative and audit processes but is excluded from active review queries.

## Review Summary

After deletion, the service recalculates the lister profile summary from all remaining non-deleted reviews:

```json
{
  "averageRating": 4.5,
  "reviewCount": 2,
  "ratingCounts": {
    "oneStar": 0,
    "twoStars": 0,
    "threeStars": 0,
    "fourStars": 1,
    "fiveStars": 1
  },
  "tagCounts": [
    { "tag": "HELPFUL", "count": 1 },
    { "tag": "RESPONSIVE", "count": 1 }
  ]
}
```

When no active reviews remain, the summary becomes:

```json
{
  "averageRating": 0,
  "reviewCount": 0,
  "ratingCounts": {
    "oneStar": 0,
    "twoStars": 0,
    "threeStars": 0,
    "fourStars": 0,
    "fiveStars": 0
  },
  "tagCounts": []
}
```

## Missing Related Records

### Missing Review Author

The review is still removed and its summary is still recalculated. Notification creation is skipped because there is no recipient account.

### Missing Lister Profile

The orphaned review is still removable. The endpoint returns an empty calculated summary and does not fail merely because the related profile record is missing.

Moderation must not leave an orphaned review permanently undeletable.

## Notification

When the review author exists, one notification is created for that author:

```json
{
  "type": "REVIEW_REMOVED",
  "title": "Review removed",
  "message": "Your review was removed after moderation. Reason: Contains prohibited content.",
  "entityType": "REVIEW",
  "entityId": "6a5d9534e5cb5681182ef64e",
  "link": null,
  "metadata": {
    "reviewId": "6a5d9534e5cb5681182ef64e",
    "reviewerId": "6a5d9533e5cb5681182ef647",
    "listerProfileId": "6a5d9534e5cb5681182ef64b",
    "reason": "Contains prohibited content."
  }
}
```

Notification rules:

- recipient is the review author, not the lister
- actor is the moderating owner or admin
- no broken link is provided for removed content
- the complete reason is retained in metadata
- the displayed message is shortened with `...` when necessary to stay within 500 characters
- a missing reviewer account skips notification creation without failing moderation

The notification is persisted in the transaction and emitted over the socket only after commit.

## Transaction Behavior

The following operations run in one MongoDB transaction:

```txt
soft-delete the review
recalculate and persist the lister review summary
create the reviewer notification when possible
```

- A request-scoped session is reused when supplied.
- Otherwise, the service creates and closes its own transaction session.
- A summary persistence failure rolls back the review deletion.
- A notification persistence failure rolls back both the deletion and summary update.

The notification document is not included in the HTTP response.

## Backend Flow

```txt
authenticate the access token
load and require the current active user
require OWNER or ADMIN role
validate reviewId, actorId, body, reason, and optional session
start or reuse a MongoDB transaction
atomically soft-delete an active review
return LISTER_REVIEW_NOT_FOUND when no review matches
recalculate the lister review summary
check whether the review author still exists
create a reviewer notification when possible
commit the transaction
emit the notification after commit
return the deleted review and updated summary
```

## Success Response

Status:

```http
200 OK
```

Body:

```json
{
  "success": true,
  "data": {
    "review": {
      "_id": "6a5d9534e5cb5681182ef64e",
      "reviewerId": "6a5d9533e5cb5681182ef647",
      "listerProfileId": "6a5d9534e5cb5681182ef64b",
      "relatedListingId": null,
      "relatedBuildingId": null,
      "rating": 1,
      "tags": ["RUDE"],
      "comment": "Review content",
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
        "removedBy": "6a5638c8fc6d6328c9e1b282",
        "removedAt": "2026-07-20T03:27:35.092Z",
        "removedReason": "Contains prohibited content."
      },
      "visibility": {
        "isCollapsed": false,
        "collapsedBy": null,
        "collapsedAt": null,
        "collapseReason": null
      },
      "editedAt": null,
      "isDeleted": true,
      "deletedAt": "2026-07-20T03:27:35.092Z",
      "createdAt": "2026-07-20T03:25:40.279Z",
      "updatedAt": "2026-07-20T03:27:35.093Z"
    },
    "reviewSummary": {
      "averageRating": 4,
      "reviewCount": 3,
      "ratingCounts": {
        "oneStar": 0,
        "twoStars": 0,
        "threeStars": 1,
        "fourStars": 1,
        "fiveStars": 1
      },
      "tagCounts": [
        { "tag": "HELPFUL", "count": 1 },
        { "tag": "RESPONSIVE", "count": 1 }
      ]
    }
  }
}
```

## Error Responses

### Invalid Review ID

Status: `422 Unprocessable Entity`

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reviewId must be a valid id"
}
```

### Body Is Not An Object

Status: `422 Unprocessable Entity`

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "body must be an object"
}
```

This response covers a missing body, `null`, and array bodies.

### Reason Is Required

Status: `422 Unprocessable Entity`

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reason is required"
}
```

This response covers a missing, `null`, or blank reason.

### Invalid Reason Type

Status: `422 Unprocessable Entity`

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reason must be a string"
}
```

### Reason Too Long

Status: `422 Unprocessable Entity`

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reason must be at most 500 characters"
}
```

### Review Not Found

Status: `404 Not Found`

```json
{
  "success": false,
  "code": "LISTER_REVIEW_NOT_FOUND",
  "message": "Review not found"
}
```

This response also covers already-deleted reviews and concurrent repeated requests.

### Invalid JSON

Status: `400 Bad Request`

```json
{
  "success": false,
  "code": "INVALID_JSON",
  "message": "Request body must be valid JSON"
}
```

### Missing Access Token

Status: `401 Unauthorized`

```json
{
  "success": false,
  "code": "ACCESS_TOKEN_REQUIRED",
  "message": "Access token is required"
}
```

An absent header and an empty bearer token return the same response.

### Invalid Access Token

Status: `401 Unauthorized`

```json
{
  "success": false,
  "code": "INVALID_ACCESS_TOKEN",
  "message": "Invalid or expired access token"
}
```

### Forbidden Role

Status: `403 Forbidden`

```json
{
  "success": false,
  "code": "FORBIDDEN",
  "message": "Forbidden"
}
```

### Suspended User

Status: `403 Forbidden`

```json
{
  "success": false,
  "code": "ACCOUNT_SUSPENDED",
  "message": "Account is suspended"
}
```

### Inactive User

Status: `403 Forbidden`

```json
{
  "success": false,
  "code": "ACCOUNT_INACTIVE",
  "message": "Account is inactive"
}
```

### User Not Found

Status: `404 Not Found`

```json
{
  "success": false,
  "code": "USER_NOT_FOUND",
  "message": "User not found"
}
```

## Indexes

No new index is required for the deletion lookup. MongoDB starts with the review collection's unique `_id` index and then checks `isDeleted` on that one candidate.

Summary recalculation uses the existing lister-review index beginning with:

```js
{
  listerProfileId: 1,
  isDeleted: 1
}
```

## Tested Checklist

Automated MongoDB integration suite: `22/22` passed.

```txt
malformed reviewId
malformed actorId
invalid session type
missing, null, and array bodies
missing, null, non-string, and blank reasons
reason over 500 characters
unknown review
already-deleted review
complete soft-delete and moderation metadata
review-summary recalculation and persistence
review-author notification content and recipient
repeat deletion
500-character reason and notification boundary
missing reviewer skips notification
missing lister profile does not block deletion
rollback when summary persistence fails
rollback when notification persistence fails
controller currentUser identity and supplied-session reuse
fixture cleanup
```

Postman DELETE flow: `25` endpoint scenarios passed.

```txt
OWNER moderation success
review summary recalculation
review-author notification retrieval
repeat deletion
500-character reason success
notification truncation with complete metadata
missing reviewer success
missing lister profile success
malformed reviewId
unknown valid reviewId
already-deleted review
missing, null, and array bodies
missing and null reasons
non-string and blank reasons
501-character reason rejection
malformed JSON
missing and empty bearer tokens
invalid access token
USER role forbidden
suspended owner
inactive owner
missing user
reason whitespace trimming
empty final review summary
```

Final integrity verification:

```txt
missing reviewer notifications: 0
missing profile reviewer notifications: 1
lister notifications: 0
maximum notification message length: 500
maximum metadata reason length: 500
platform owner restored to ACTIVE
temporary reviews: 0
temporary notifications: 0
temporary profiles: 0
temporary users: 0
```
