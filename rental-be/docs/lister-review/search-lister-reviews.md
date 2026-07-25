# Search Lister Reviews

Get public reviews for one lister profile.

Authentication is optional. When an active viewer is authenticated, the viewer's own review is returned separately as `myReview`.

## Endpoint

```http
GET /api/v1/lister-reviews/listers/:listerProfileId
```

Full local URL:

```http
GET http://localhost:3000/api/v1/lister-reviews/listers/:listerProfileId?page=1&limit=20&sort=latest
```

Example:

```http
GET http://localhost:3000/api/v1/lister-reviews/listers/6a5669f81a9630e315e059a7?page=1&limit=20&sort=latest
```

## Headers

Optional:

```http
Authorization: Bearer ACCESS_TOKEN
```

## Optional Auth Behavior

| Token / user state | Behavior |
| --- | --- |
| No token | Allow as anonymous |
| Invalid or expired access token | Allow as anonymous |
| Refresh token sent as bearer token | Allow as anonymous |
| Valid token, user `ACTIVE` | Return viewer's own review as `myReview` when it exists |
| Valid token, user `SUSPENDED` | Allow as anonymous |
| Valid token, user `INACTIVE` | Allow as anonymous |
| Valid token, user deleted or missing | Allow as anonymous |

Anonymous viewers always get:

```json
{
  "myReview": null
}
```

## Query Params

```txt
page   optional, default 1, range 1 to 10000
limit  optional, default 20, range 1 to 100
sort   optional, default latest
```

Allowed `sort` values:

```txt
latest
oldest
highest
lowest
```

## Public Visibility Rules

The lister profile is available only when:

- `listerProfileId` exists
- lister profile is not deleted
- linked lister owner user exists
- linked lister owner user status is `ACTIVE`

Reviews are returned only when:

- review belongs to the lister profile
- review is not deleted

If the lister profile is deleted, missing, owned by a missing user, or owned by a non-active user, the endpoint returns:

```json
{
  "success": false,
  "code": "LISTER_PROFILE_NOT_FOUND",
  "message": "Lister profile not found"
}
```

This avoids exposing whether a lister account is suspended, inactive, deleted, or missing.

## Response Rules

When the viewer has already reviewed this lister:

- `myReview` contains the viewer's review.
- `reviews` excludes the viewer's review to avoid duplicates.
- `pagination.total` counts only the normal `reviews` list, not `myReview`.

Public review responses do not expose:

- `moderation`
- `isDeleted`
- `deletedAt`
- `interaction.contactEventId`

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
    "myReview": null,
    "reviews": [
      {
        "_id": "6a5a00000000000000000001",
        "reviewerId": "6a5638bafc6d6328c9e1b281",
        "listerProfileId": "6a5669f81a9630e315e059a7",
        "relatedListingId": null,
        "relatedBuildingId": null,
        "rating": 5,
        "tags": ["RESPONSIVE", "HELPFUL"],
        "comment": "Fast response and clear information.",
        "interaction": {
          "isVerified": false,
          "verifiedBy": null,
          "verifiedAt": null
        },
        "visibility": {
          "isCollapsed": false,
          "collapsedBy": null,
          "collapsedAt": null,
          "collapseReason": null
        },
        "editedAt": null,
        "createdAt": "2026-07-17T10:00:00.000Z",
        "updatedAt": "2026-07-17T10:00:00.000Z",
        "reviewer": {
          "userId": "6a5638bafc6d6328c9e1b281",
          "name": "Test Normal User",
          "displayName": "Test Normal User",
          "profilePhoto": null,
          "isVerified": false
        }
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

## Viewer Has Own Review

```json
{
  "success": true,
  "data": {
    "myReview": {
      "_id": "6a5a00000000000000000002",
      "reviewerId": "6a5638bafc6d6328c9e1b281",
      "listerProfileId": "6a5669f81a9630e315e059a7",
      "rating": 4,
      "tags": ["HELPFUL"],
      "comment": "Helpful lister.",
      "interaction": {
        "isVerified": false,
        "verifiedBy": null,
        "verifiedAt": null
      },
      "visibility": {
        "isCollapsed": false,
        "collapsedBy": null,
        "collapsedAt": null,
        "collapseReason": null
      },
      "editedAt": null,
      "createdAt": "2026-07-17T10:00:00.000Z",
      "updatedAt": "2026-07-17T10:00:00.000Z",
      "reviewer": {
        "userId": "6a5638bafc6d6328c9e1b281",
        "name": "Test Normal User",
        "displayName": "Test Normal User",
        "profilePhoto": null,
        "isVerified": false
      }
    },
    "reviews": []
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0
  }
}
```

## Empty Result

If the public lister profile exists but has no visible reviews:

```json
{
  "success": true,
  "data": {
    "myReview": null,
    "reviews": []
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0
  }
}
```

## Validation Errors

Invalid `listerProfileId`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "listerProfileId must be a valid id"
}
```

Invalid `sort`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid sort: random"
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

## Indexes

The endpoint uses normal MongoDB indexes on `lister_reviews`.

Latest and oldest:

```js
{
  listerProfileId: 1,
  isDeleted: 1,
  createdAt: -1,
  _id: -1
}
```

Highest:

```js
{
  listerProfileId: 1,
  isDeleted: 1,
  rating: -1,
  createdAt: -1,
  _id: -1
}
```

Lowest:

```js
{
  listerProfileId: 1,
  isDeleted: 1,
  rating: 1,
  createdAt: -1,
  _id: -1
}
```

## Tested Checklist

- anonymous success
- active viewer receives `myReview`
- `myReview` is excluded from normal `reviews`
- pagination
- out-of-range page
- `latest` sort
- `oldest` sort
- `highest` sort
- `lowest` sort
- hidden reviews are excluded
- deleted reviews are excluded
- public projection hides internal fields
- invalid `listerProfileId`
- unknown lister profile
- deleted lister profile
- inactive lister owner
- suspended lister owner
- missing lister owner
- invalid `sort`
- invalid `page`
- invalid `limit`
- no token allowed as anonymous
- invalid token allowed as anonymous
- suspended viewer token allowed as anonymous
- inactive viewer token allowed as anonymous
- missing viewer token allowed as anonymous
