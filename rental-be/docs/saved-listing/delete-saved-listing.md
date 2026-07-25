# Delete Saved Listing

Remove one saved listing for the authenticated user.

This endpoint is user-scoped. The caller cannot delete another user's saved listing.

## Endpoint

```http
DELETE /api/v1/saved-listings/:listingId
```

Full local URL:

```http
DELETE http://localhost:3000/api/v1/saved-listings/6a5d5ce7873de680f61d1eba
```

## Auth

Requires an active user access token.

```http
Authorization: Bearer ACCESS_TOKEN
```

The route uses:

```txt
authenticate
requireActiveUser
```

Suspended, inactive, deleted, or missing users cannot access this endpoint.

## Path Params

```txt
listingId  required, valid Mongo ObjectId
```

## Request Body

No request body is required.

Do not send:

```txt
userId
savedListingId
```

The backend deletes by the authenticated caller and path `listingId`.

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
    "_id": "6a5d5ce7873de680f61d1ebb",
    "userId": "6a5638bafc6d6328c9e1b281",
    "listingId": "6a5d5ce7873de680f61d1eba",
    "buildingId": "6a57c6da947d934e03495b7a",
    "listedBy": "6a5638bafc6d6328c9e1b281",
    "snapshot": {
      "rent": 23456,
      "visibility": "PUBLIC",
      "buildingName": "Bangkapi Protected Field Residence",
      "coverPhoto": {
        "publicId": "tmp/postman-delete-saved-listing",
        "secureUrl": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        "resourceType": "image",
        "format": "jpg",
        "width": 800,
        "height": 600,
        "bytes": 120000,
        "position": 0,
        "alt": "Temporary Postman delete saved listing room",
        "isCover": true
      }
    },
    "createdAt": "2026-07-19T23:25:27.609Z",
    "updatedAt": "2026-07-19T23:25:27.609Z"
  }
}
```

## Response Notes

The endpoint returns the deleted saved-listing row.

The returned projection is:

```txt
_id
userId
listingId
buildingId
listedBy
snapshot
createdAt
updatedAt
```

Delete only checks whether the saved row exists for the current user.

It does not require:

- the live listing to still exist
- the live listing to still be public
- the live listing to not be deleted
- the building to still be active
- the lister agent profile to still be available

If the saved row does not exist for the current user, the endpoint returns `SAVED_LISTING_NOT_FOUND`.

## Backend Flow

1. Validate `session`.
2. Validate authenticated `actorId` as `userId`.
3. Validate `listingId`.
4. Delete exactly one row by:

```js
{
  userId,
  listingId
}
```

5. If no row is deleted, return `SAVED_LISTING_NOT_FOUND`.
6. Return the deleted saved-listing row.

## Backend-Controlled Fields

The backend always uses:

- current user id from `req.currentUser._id`
- `listingId` from the path
- ownership filter `{ userId: currentUserId, listingId }`

The frontend cannot choose:

- `userId`
- another user's saved-listing owner
- saved-listing `_id` directly

## Idempotency

This endpoint is intentionally not idempotent.

Deleting an existing saved row returns `200`.

Deleting the same listing again returns:

```txt
SAVED_LISTING_NOT_FOUND
```

## Indexes

The saved listing model has the required unique index:

```js
{ userId: 1, listingId: 1 }, { unique: true }
```

This supports exact lookup and deletion by current user and listing id.

No new index is needed for this endpoint.

## Error Cases

### Missing Access Token

Response:

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

### Invalid Access Token

Response:

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

### Suspended User

Response:

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

### Inactive User

Response:

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

### Deleted Or Missing User

Response:

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

### Invalid Listing Id

Response:

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

### Saved Listing Not Found

Response:

```http
404 Not Found
```

```json
{
  "success": false,
  "code": "SAVED_LISTING_NOT_FOUND",
  "message": "Saved listing not found"
}
```

This applies when:

- the caller never saved the listing
- the caller already deleted the saved row
- the saved row belongs to another user

## Tested Checklist

Backend scenario suite:

```txt
caller can delete own saved listing
deleted response projection is stable
saved row is removed
can delete saved row even if live listing is private
can delete saved row even if live listing is deleted
can delete stale saved row when live listing no longer exists
second delete returns not found
cannot delete another users saved listing
other users saved row remains
invalid listingId rejected
invalid actorId rejected
invalid session rejected
missing saved listing rejected
session-supported delete works
auth missing token rejected
auth invalid token rejected
auth active user accepted
auth suspended user rejected
auth inactive user rejected
auth deleted/missing user rejected
temporary test data cleaned up
```

Postman checklist:

```txt
login as active user
delete own saved listing
delete same listing again
invalid listing id
missing saved listing
cannot delete another user's saved listing
missing Authorization header
malformed Authorization header
invalid access token
suspended user
inactive user
deleted/missing user
temporary listing/saved rows cleaned up
```
