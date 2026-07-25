# Create Saved Listing

Save a public listing for the authenticated user.

This endpoint is user-scoped. The caller cannot choose another user or submit snapshot fields.

## Endpoint

```http
POST /api/v1/saved-listings/:listingId
```

Full local URL:

```http
POST http://localhost:3000/api/v1/saved-listings/6a57c6db947d934e03495b7b
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
buildingId
listedBy
snapshot
```

The backend derives all of these from the authenticated user, listing, and active building.

## Success Response

Status:

```http
201 Created
```

Body:

```json
{
  "success": true,
  "data": {
    "_id": "6a5d578a028bb38c3dc1786f",
    "userId": "6a5638bafc6d6328c9e1b281",
    "listingId": "6a5d57655d7c2afb1519a21b",
    "buildingId": "6a57c6da947d934e03495b7a",
    "listedBy": "6a5638bafc6d6328c9e1b281",
    "snapshot": {
      "rent": 12345,
      "visibility": "PUBLIC",
      "buildingName": "Bangkapi Protected Field Residence",
      "coverPhoto": {
        "publicId": "tmp/postman-create-saved-listing",
        "secureUrl": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        "resourceType": "image",
        "format": "jpg",
        "width": 800,
        "height": 600,
        "bytes": 120000,
        "position": 0,
        "alt": "Temporary Postman create saved listing room",
        "isCover": true
      }
    },
    "createdAt": "2026-07-19T23:02:34.575Z",
    "updatedAt": "2026-07-19T23:02:34.575Z"
  }
}
```

## Snapshot

The backend stores the listing state at save time:

```js
{
  rent,
  visibility,
  buildingName,
  coverPhoto
}
```

`coverPhoto` is selected from the listing media:

```txt
first media where isCover is true
otherwise first media item
otherwise null
```

Saving your own public listing is allowed.

## Business Rules

The listing must:

- exist
- have `isDeleted !== true`
- have `visibility: "PUBLIC"`

The building must:

- exist
- have `isActive: true`

Private listings, deleted listings, and missing listings all return `LISTING_NOT_FOUND`.

Missing or inactive buildings return `BUILDING_NOT_FOUND`.

Duplicate saves return `SAVED_LISTING_ALREADY_EXISTS`.

The duplicate rule is enforced by both:

- a service-level pre-check
- the unique index `{ userId: 1, listingId: 1 }`

The unique index still protects race conditions when two save requests arrive at the same time.

## Backend Flow

1. Validate `session`.
2. Validate authenticated `actorId` as `userId`.
3. Validate `listingId`.
4. Check whether `{ userId, listingId }` is already saved.
5. Load only public, non-deleted listing fields needed for the snapshot.
6. Load only active building fields needed for the snapshot.
7. Build the saved-listing record server-side.
8. Create saved listing.
9. Catch duplicate-key races and return `SAVED_LISTING_ALREADY_EXISTS`.
10. Return saved listing row.

## Backend-Controlled Fields

The backend always controls:

- `userId`
- `listingId`
- `buildingId`
- `listedBy`
- `snapshot.rent`
- `snapshot.visibility`
- `snapshot.buildingName`
- `snapshot.coverPhoto`

The frontend cannot choose:

- another saved-listing owner
- another listing owner
- another building id
- snapshot values

## Indexes

Duplicate prevention:

```js
{ userId: 1, listingId: 1 }, { unique: true }
```

Saved-listing list pagination:

```js
{ userId: 1, createdAt: -1, _id: -1 }
```

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

### Listing Not Found

Response:

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

This also applies to private and soft-deleted listings.

### Building Not Found

Response:

```http
404 Not Found
```

```json
{
  "success": false,
  "code": "BUILDING_NOT_FOUND",
  "message": "Building not found"
}
```

This also applies when the listing's building exists but is inactive.

### Already Saved

Response:

```http
409 Conflict
```

```json
{
  "success": false,
  "code": "SAVED_LISTING_ALREADY_EXISTS",
  "message": "Listing is already saved"
}
```

## Tested Checklist

Backend scenario suite:

```txt
public listing can be saved
own public listing is allowed
snapshot stores listing and building data
snapshot handles listing without media
duplicate save rejected
duplicate race is index-safe
invalid listingId rejected
invalid actorId rejected
invalid session rejected
missing listing rejected
private listing rejected
deleted listing rejected
missing building rejected
inactive building rejected
session-supported create works
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
save public listing
duplicate save
invalid listing id
missing listing
private listing
deleted listing
inactive building
missing Authorization header
malformed Authorization header
invalid access token
suspended user
inactive user
deleted/missing user
temporary listing/building/saved rows cleaned up
```
