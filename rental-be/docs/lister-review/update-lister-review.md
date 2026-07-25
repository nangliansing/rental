# Update Lister Review

Update the authenticated user's own non-deleted lister review.

This endpoint is authenticated. Only the original reviewer can update their review.

## Endpoint

```http
PATCH /api/v1/lister-reviews/:reviewId
```

Full local URL:

```http
PATCH http://localhost:3000/api/v1/lister-reviews/:reviewId
```

Example:

```http
PATCH http://localhost:3000/api/v1/lister-reviews/6a5a7ceb6fa6418a464839c2
```

## Headers

```http
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

## Path Params

```txt
reviewId  required, valid lister review id
```

## Request Body

All fields are optional, but at least one field must create a real change.

```json
{
  "rating": 5,
  "tags": ["HELPFUL", "RESPONSIVE"],
  "comment": "Updated from Postman.",
  "relatedListingId": "6a57d0e4947d934e03495b84",
  "relatedBuildingId": "6a57c6da947d934e03495b7a"
}
```

Fields:

```txt
rating             optional, integer, 1 to 5
tags               optional, array of allowed review tags
comment            optional, string or null, max 1200 characters
relatedListingId   optional, valid listing id or null
relatedBuildingId  optional, valid building id or null
```

Allowed `tags`:

```txt
RESPONSIVE
HELPFUL
ACCURATE_INFO
FRIENDLY
CLEAR_COMMUNICATION
FAST_FOLLOW_UP
UNRESPONSIVE
INACCURATE_INFO
RUDE
SUSPICIOUS
PRESSURE_TACTICS
```

## Related Listing And Building Rules

If `relatedListingId` is provided:

- listing must exist
- listing must belong to the reviewed lister profile owner
- listing must not be deleted
- backend derives `relatedBuildingId` from the listing

If both `relatedListingId` and `relatedBuildingId` are provided:

- `relatedBuildingId` must match the listing's `buildingId`

If only `relatedBuildingId` is provided:

- building must exist
- building must be active
- lister must have a non-deleted listing in that building

If `relatedListingId` is `null`:

- backend clears both `relatedListingId` and `relatedBuildingId`
- request must not include a non-null `relatedBuildingId`

## Business Rules

The backend always uses the authenticated user as reviewer.

Update is allowed only when:

- reviewer user exists
- reviewer user status is `ACTIVE`
- review exists
- review belongs to the authenticated user
- review is not deleted
- lister profile exists
- lister profile is not deleted
- lister owner user exists
- lister owner user status is `ACTIVE`

Review lifecycle is simple:

- `isDeleted: true` means the review cannot be updated
- `visibility.isCollapsed` is display state only and does not prevent update
- there is no review `status` field

Update runs inside a transaction:

- update review
- recalculate lister `reviewSummary`

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
      "editedAt": "2026-07-17T19:38:26.527Z",
      "isDeleted": false,
      "deletedAt": null,
      "createdAt": "2026-07-17T19:05:15.066Z",
      "updatedAt": "2026-07-17T19:38:26.528Z"
    },
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
        },
        {
          "tag": "RESPONSIVE",
          "count": 1
        }
      ]
    }
  }
}
```

## Common Success Bodies

Update rating:

```json
{
  "rating": 4
}
```

Update tags:

```json
{
  "tags": ["ACCURATE_INFO", "CLEAR_COMMUNICATION"]
}
```

Update comment:

```json
{
  "comment": "Updated from Postman."
}
```

Set related listing and derive building:

```json
{
  "relatedListingId": "6a57d0e4947d934e03495b84"
}
```

Set building only:

```json
{
  "relatedBuildingId": "6a57c6da947d934e03495b7a"
}
```

Clear related listing and building:

```json
{
  "relatedListingId": null
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

```json
{
  "success": false,
  "code": "ACCOUNT_SUSPENDED",
  "message": "Account is suspended"
}
```

Inactive reviewer:

```json
{
  "success": false,
  "code": "ACCOUNT_INACTIVE",
  "message": "Account is inactive"
}
```

Invalid `reviewId`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reviewId must be a valid id"
}
```

Review not found, deleted, or owned by another reviewer:

```json
{
  "success": false,
  "code": "LISTER_REVIEW_NOT_FOUND",
  "message": "Review not found"
}
```

No real change:

```json
{
  "success": false,
  "code": "NO_VALID_CHANGE",
  "message": "No valid change"
}
```

Lister profile not found:

```json
{
  "success": false,
  "code": "LISTER_PROFILE_NOT_FOUND",
  "message": "Lister profile not found"
}
```

Lister owner is not active:

```json
{
  "success": false,
  "code": "ACTIVE_LISTER_REQUIRED",
  "message": "Active lister is required"
}
```

Related listing not found:

```json
{
  "success": false,
  "code": "RELATED_LISTING_NOT_FOUND",
  "message": "Related listing not found"
}
```

Related building not found:

```json
{
  "success": false,
  "code": "RELATED_BUILDING_NOT_FOUND",
  "message": "Related building not found"
}
```

Listing and building mismatch:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "relatedBuildingId must match relatedListingId building"
}
```

Clearing listing with conflicting building:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "relatedBuildingId must be null when relatedListingId is null"
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

Body is not an object:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "body must be an object"
}
```

## Tested Checklist

- active reviewer can update comment
- active reviewer can update rating and summary recalculates
- active reviewer can update tags and summary recalculates
- related listing derives related building
- related listing plus matching building succeeds
- building-only relation succeeds when lister has a listing in that building
- `relatedListingId: null` clears listing and building
- no `status` field is returned
- invalid `reviewId`
- invalid rating
- invalid tags
- invalid related listing id
- invalid related building id
- unknown review
- wrong reviewer cannot update
- unknown related listing
- other lister related listing
- deleted related listing
- unknown related building
- inactive related building
- listing/building mismatch
- clearing listing with conflicting building
- no valid change
- body is not an object
- invalid JSON
- missing token
- invalid token
- suspended reviewer
- inactive reviewer
- suspended lister owner
- deleted review
- deleted lister profile
