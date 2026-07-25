# Delete Lister Review

Soft-delete the authenticated user's own lister review.

This endpoint is authenticated. Only the original reviewer can delete their review.

## Endpoint

```http
DELETE /api/v1/lister-reviews/:reviewId
```

Full local URL:

```http
DELETE http://localhost:3000/api/v1/lister-reviews/:reviewId
```

Example:

```http
DELETE http://localhost:3000/api/v1/lister-reviews/6a5a7ceb6fa6418a464839c2
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

The backend always uses the authenticated user as reviewer.

Delete is allowed only when:

- reviewer user exists
- reviewer user status is `ACTIVE`
- review exists
- review belongs to the authenticated user
- review is not already deleted

Delete is a soft delete:

- sets `isDeleted: true`
- sets `deletedAt` to the current time
- does not remove the MongoDB document
- does not require the lister profile or lister owner to still be active

Review lifecycle is simple:

- `isDeleted: true` means the review is no longer active
- `visibility.isCollapsed` is display state only and does not prevent delete
- there is no review `status` field

Delete runs inside a transaction:

- soft-delete review
- recalculate lister `reviewSummary`

No new index is required for this endpoint because the delete lookup starts from `_id`, then applies `reviewerId` and `isDeleted` guards.

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
    "review": {
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
      "visibility": {
        "isCollapsed": false,
        "collapsedBy": null,
        "collapsedAt": null,
        "collapseReason": null
      },
      "editedAt": "2026-07-17T19:59:17.754Z",
      "isDeleted": true,
      "deletedAt": "2026-07-17T20:36:35.192Z",
      "createdAt": "2026-07-17T19:05:15.066Z",
      "updatedAt": "2026-07-17T20:36:35.192Z"
    },
    "reviewSummary": {
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

Suspended reviewer:

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

Inactive reviewer:

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

Review not found, already deleted, or owned by another reviewer:

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

## Tested Checklist

- active reviewer can delete their own review
- delete sets `isDeleted: true`
- delete sets `deletedAt`
- delete recalculates lister `reviewSummary`
- repeat delete returns `LISTER_REVIEW_NOT_FOUND`
- invalid `reviewId`
- unknown review
- wrong reviewer cannot delete
- missing token
- malformed bearer token
- invalid token
- suspended reviewer
- inactive reviewer
- token user not found
- final restore confirmed `isDeleted: false`, `deletedAt: null`, and summary restored
