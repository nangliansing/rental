# Create Lister Review

Create one review for a lister profile.

This endpoint is authenticated. A user can review a lister once while their previous review is active.

## Endpoint

```http
POST /api/v1/lister-reviews/:listerProfileId
```

Full local URL:

```http
POST http://localhost:3000/api/v1/lister-reviews/:listerProfileId
```

Example:

```http
POST http://localhost:3000/api/v1/lister-reviews/6a5669f81a9630e315e059a7
```

## Headers

```http
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

## Path Params

```txt
listerProfileId  required, valid lister profile id
```

## Request Body

```json
{
  "rating": 5,
  "tags": ["HELPFUL", "RESPONSIVE"],
  "comment": "Postman create review test.",
  "relatedListingId": null,
  "relatedBuildingId": null
}
```

Fields:

```txt
rating             required, integer, 1 to 5
tags               optional, array of allowed review tags
comment            optional, string, max 1200 characters
relatedListingId   optional, valid listing id
relatedBuildingId  optional, valid building id
```

Use `null` for `relatedListingId` or `relatedBuildingId` when the review is not tied to a specific listing or building.

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
- listing must belong to the lister profile owner
- listing must not be deleted
- backend derives `relatedBuildingId` from the listing

If both `relatedListingId` and `relatedBuildingId` are provided:

- `relatedBuildingId` must match the listing's `buildingId`

If only `relatedBuildingId` is provided:

- building must exist
- building must be active
- lister must have a non-deleted listing in that building

## Business Rules

The backend always uses the authenticated user as reviewer.

Create is allowed only when:

- reviewer user exists
- reviewer user status is `ACTIVE`
- lister profile exists
- lister profile is not deleted
- lister owner user exists
- lister owner user status is `ACTIVE`
- reviewer is not reviewing their own lister profile
- reviewer does not already have a non-deleted review for this lister profile

Create runs inside a transaction:

- create review
- recalculate lister `reviewSummary`

Review lifecycle is simple:

- new reviews are active when `isDeleted` is `false`
- there is no review `status` field

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
      "editedAt": null,
      "isDeleted": false,
      "deletedAt": null,
      "createdAt": "2026-07-17T19:05:15.066Z",
      "updatedAt": "2026-07-17T19:05:15.066Z"
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

Missing reviewer:

```json
{
  "success": false,
  "code": "USER_NOT_FOUND",
  "message": "User not found"
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

Self review:

```json
{
  "success": false,
  "code": "CANNOT_REVIEW_OWN_PROFILE",
  "message": "You cannot review your own profile"
}
```

Duplicate review:

```http
409 Conflict
```

```json
{
  "success": false,
  "code": "LISTER_REVIEW_ALREADY_EXISTS",
  "message": "You already reviewed this lister"
}
```

Invalid rating:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "rating must be between 1 and 5"
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

Related listing and building mismatch:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "relatedBuildingId must match relatedListingId building"
}
```

## Indexes

Duplicate active reviews are prevented by this unique partial index:

```js
{
  reviewerId: 1,
  listerProfileId: 1
},
{
  unique: true,
  partialFilterExpression: { isDeleted: false }
}
```

No new index is needed for this endpoint.

## Tested Checklist

Service-level tests:

- create basic review without related ids
- create with `relatedListingId`
- create with matching `relatedListingId` and `relatedBuildingId`
- create with `relatedBuildingId` only when lister has a listing there
- summary recalculates after create
- duplicate active review
- self review
- inactive reviewer
- missing reviewer
- invalid `listerProfileId`
- unknown lister profile
- deleted lister profile
- inactive lister owner
- suspended lister owner
- missing lister owner
- body must be object
- missing rating
- rating must be integer
- rating below range
- rating above range
- tags must be array
- invalid tag
- comment must be string
- comment too long
- invalid `relatedListingId`
- unknown `relatedListingId`
- other-lister `relatedListingId`
- deleted `relatedListingId`
- invalid `relatedBuildingId`
- unknown `relatedBuildingId`
- inactive `relatedBuildingId`
- unrelated `relatedBuildingId`
- `relatedListingId` and `relatedBuildingId` mismatch

Postman smoke tests:

- active reviewer login
- create review returns `201`
- create response does not include review `status`
- summary recalculates after create
- duplicate review returns `409 LISTER_REVIEW_ALREADY_EXISTS`
- related listing derives building
- related listing/building mismatch returns `422 VALIDATION_ERROR`
- building-only relation succeeds when lister has a listing in that building
- invalid rating returns `422 VALIDATION_ERROR`
- missing token returns `401 ACCESS_TOKEN_REQUIRED`
