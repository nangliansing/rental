# Get My Listing By ID

Return one non-deleted listing owned by the authenticated user.

This endpoint is owner-scoped. It supports both public and private listings but never returns another user's listing.

## Endpoint

```http
GET /api/v1/listings/:listingId
```

Local example:

```http
GET http://localhost:3000/api/v1/listings/6a57d0e4947d934e03495b84
```

## Authentication

Requires an access token for an active user.

```http
Authorization: Bearer ACCESS_TOKEN
```

The route uses:

```txt
authenticate
requireActiveUser
```

Suspended, inactive, or missing users cannot access this endpoint.

## Path Parameters

| Name | Required | Notes |
| --- | --- | --- |
| `listingId` | yes | Valid MongoDB ObjectId |

## Query Parameters

None.

## Request Body

No request body is required.

## Example Request

```http
GET /api/v1/listings/6a57d0e4947d934e03495b84
Authorization: Bearer ACCESS_TOKEN
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
    "agentProfile": {
      "_id": "6a5669f81a9630e315e059a7",
      "userId": "6a5638bafc6d6328c9e1b281",
      "isOnline": true,
      "displayName": "Patch Restored Agent",
      "profilePhoto": null,
      "description": null,
      "phone": "+66899999999",
      "lineUrl": null,
      "whatsappPhone": null,
      "telegramUrl": null,
      "viberPhone": null,
      "supportLanguages": ["English", "Thai"],
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
          { "tag": "HELPFUL", "count": 1 },
          { "tag": "RESPONSIVE", "count": 1 }
        ]
      },
      "isVerified": false
    },
    "listing": {
      "_id": "6a57d0e4947d934e03495b84",
      "visibility": "PUBLIC",
      "isForeignerAccepted": true,
      "isTM30Provided": true,
      "rent": 14000,
      "deposit": 28000,
      "moveInCost": 42000,
      "bedroomCount": 1,
      "bathroomCount": 1,
      "facilities": ["Air Conditioner", "Balcony"],
      "media": [],
      "description": "Listing description",
      "isDeleted": false,
      "listedBy": "6a5638bafc6d6328c9e1b281",
      "buildingId": "6a57c6da947d934e03495b7a",
      "building": {
        "_id": "6a57c6da947d934e03495b7a",
        "name": "Bangkapi Protected Field Residence",
        "buildingType": "Apartment",
        "facilities": ["Parking", "Lift"],
        "security": ["CCTV", "Keycard Access"],
        "location": {
          "type": "Point",
          "coordinates": [100.6435, 13.7654]
        },
        "address": "Lat Phrao Road, Khlong Chan, Bang Kapi, Bangkok 10240, Thailand",
        "isActive": true
      },
      "isSavedByMe": true,
      "availableAt": null,
      "createdAt": "2026-07-15T18:26:44.251Z",
      "updatedAt": "2026-07-17T20:00:17.527Z"
    }
  }
}
```

## Ownership And Availability Rules

The listing must match all of the following:

```js
{
  _id: listingId,
  listedBy: currentUserId,
  isDeleted: false
}
```

The endpoint returns both `PUBLIC` and `PRIVATE` listings when they belong to the caller.

The following cases all return the same `LISTING_NOT_FOUND` response:

- the listing does not exist
- the listing belongs to another user
- the listing is soft-deleted

Using one response prevents the endpoint from disclosing whether another user's listing exists.

## Lookup Behavior

### Agent Profile

`data.agentProfile` belongs to the authenticated listing owner.

- Existing non-deleted profile: projected profile object
- Missing profile: `null`
- Soft-deleted profile: `null`

Deleted profile fields are never exposed.

### Building

The building lookup preserves the owner listing.

- Existing active building: populated `building`
- Existing inactive building: populated `building` with `isActive: false`
- Missing building: explicit `building: null`

Inactive and missing buildings do not hide an owner-managed listing. Public search applies stricter availability rules.

### Saved State

`listing.isSavedByMe` is calculated for the authenticated caller by matching both:

```js
{
  listingId: listing._id,
  userId: currentUserId
}
```

It is `true` only when the caller saved this listing; otherwise it is `false`.

### Availability Date

`listing.availableAt` is always present as `null` or an ISO datetime. See [`available-at-response.md`](./available-at-response.md).

## Backend Flow

```txt
authenticate the access token
load and require the current active user
validate params and listingId
derive listedBy from the current user
match owned, non-deleted listing
preserve and populate the building when available
calculate caller-specific isSavedByMe
load the caller's non-deleted agent profile in parallel
return the stable response envelope
```

The client cannot provide or override `listedBy` or the viewer used for `isSavedByMe`.

## Database Index

No additional index is required for this endpoint.

MongoDB first uses the listing collection's unique `_id` index. The owner and deletion predicates are then checked against that single candidate:

```js
{
  _id: listingId,
  listedBy: currentUserId,
  isDeleted: false
}
```

## Error Responses

### Invalid Listing ID

Status: `422 Unprocessable Entity`

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "listingId must be a valid id"
}
```

### Listing Not Found

Status: `404 Not Found`

```json
{
  "success": false,
  "code": "LISTING_NOT_FOUND",
  "message": "Listing not found"
}
```

This response also covers listings belonging to another user and soft-deleted listings.

### Missing Access Token

Status: `401 Unauthorized`

```json
{
  "success": false,
  "code": "ACCESS_TOKEN_REQUIRED",
  "message": "Access token is required"
}
```

### Invalid Access Token

Status: `401 Unauthorized`

```json
{
  "success": false,
  "code": "INVALID_ACCESS_TOKEN",
  "message": "Invalid or expired access token"
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

### Missing User

Status: `404 Not Found`

```json
{
  "success": false,
  "code": "USER_NOT_FOUND",
  "message": "User not found"
}
```

## Tested Checklist

Backend scenario suite: `28/28` passed.

```txt
owned public listing
owned private listing
agent profile projection
active building populated
inactive building preserved
missing building normalized to null
isSavedByMe true
isSavedByMe false
soft-deleted agent profile excluded
owner listing collection also excludes deleted profile
another owner's listing hidden
soft-deleted listing hidden
unknown valid listing id
invalid listing id
missing listing id
invalid params input
invalid actor id
invalid session
MongoDB session support
controller success envelope
valid access token
missing access token
empty bearer token
invalid access token
active user
suspended user
inactive user
missing user
temporary fixtures cleaned up
```

Postman checklist:

```txt
active listing-owner login
owned public listing
owned private listing
saved and unsaved listing states
inactive building preserved
missing building returned as null
invalid listing id
unknown valid listing id
another owner's listing hidden
soft-deleted listing hidden
missing Authorization header
empty bearer token
invalid access token
suspended user
inactive user
missing user
missing agent profile returned as null
soft-deleted agent profile returned as null
temporary listings, profiles, backups, and user states restored
```
