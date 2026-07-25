# Get Saved Listings

Get the authenticated user's saved listings.

This endpoint is user-scoped. The caller cannot request another user's saved listings.

## Endpoint

```http
GET /api/v1/saved-listings
```

Full local URL:

```http
GET http://localhost:3000/api/v1/saved-listings?page=1&limit=20
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

## Query Parameters

| Name | Required | Default | Notes |
| --- | --- | --- | --- |
| `page` | no | `1` | Integer between `1` and `10000` |
| `limit` | no | `20` | Integer between `1` and `100` |

## Request Body

No request body is required.

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
    "savedListings": [
      {
        "_id": "6a5954f5f0dc56f38c2130c2",
        "listingId": "6a57d0e4947d934e03495b84",
        "buildingId": "6a57c6da947d934e03495b7a",
        "listedBy": "6a5638bafc6d6328c9e1b281",
        "snapshot": {
          "rent": 14000,
          "visibility": "PUBLIC",
          "buildingName": "Bangkapi Protected Field Residence",
          "coverPhoto": {
            "publicId": "pending-posts/existing-building-approve-test",
            "secureUrl": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
            "resourceType": "image",
            "format": "jpg",
            "width": 800,
            "height": 600,
            "bytes": 120000,
            "position": 0,
            "alt": "Existing building approve test room",
            "isCover": true
          }
        },
        "createdAt": "2026-07-16T22:02:29.733Z",
        "updatedAt": "2026-07-16T22:02:29.733Z",
        "listing": {
          "_id": "6a57d0e4947d934e03495b84",
          "visibility": "PUBLIC",
          "isForeignerAccepted": true,
          "isTM30Provided": true,
          "rent": 14000,
          "deposit": 28000,
          "moveInCost": 42000,
          "electricRate": 8,
          "waterRate": 20,
          "bedroomCount": 1,
          "bathroomCount": 1,
          "kitchenType": "Kitchen",
          "size": 36,
          "contractMonths": 12,
          "occupancy": 2,
          "isCookingAllowed": true,
          "isPetAllowed": false,
          "facilities": ["Air Conditioner", "Balcony"],
          "media": [
            {
              "publicId": "pending-posts/existing-building-approve-test",
              "secureUrl": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
              "resourceType": "image",
              "format": "jpg",
              "width": 800,
              "height": 600,
              "bytes": 120000,
              "position": 0,
              "alt": "Existing building approve test room",
              "isCover": true
            }
          ],
          "description": "Pending post using an existing building for approve test.",
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
            "minRent": 13000,
            "maxRent": 15000,
            "createdAt": "2026-07-15T17:43:54.984Z",
            "updatedAt": "2026-07-19T22:21:24.375Z"
          },
          "agentProfile": {
            "_id": "6a5669f81a9630e315e059a7",
            "userId": "6a5638bafc6d6328c9e1b281",
            "isOnline": true,
            "displayName": "Patch Restored Agent",
            "profilePhoto": null,
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
                {
                  "tag": "HELPFUL",
                  "count": 1
                },
                {
                  "tag": "RESPONSIVE",
                  "count": 1
                }
              ]
            },
            "isVerified": false
          },
          "isSavedByMe": true,
          "createdAt": "2026-07-15T18:26:44.251Z",
          "updatedAt": "2026-07-17T20:00:17.527Z"
        }
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2
  }
}
```

## Response Notes

Each saved listing always includes the saved row and `snapshot`.

`snapshot` is the listing state captured when the user saved the listing:

```js
{
  rent,
  visibility,
  buildingName,
  coverPhoto
}
```

The live `listing` field is best-effort:

- `listing` is an object when the live listing is still available to the current user.
- `listing` is `null` when the live listing is no longer available.
- `listing.isSavedByMe` is always `true` when `listing` is populated.
- `listing.agentProfile` is an object when the lister has an available active agent profile.
- `listing.agentProfile` is `null` when only the lister agent profile is unavailable.

## Availability Rules

The saved row remains visible even if the live listing is unavailable.

The live `listing` becomes `null` when:

- the listing no longer exists
- the listing is soft-deleted
- the listing is private and does not belong to the current user
- the listing's building is missing
- the listing's building is inactive

The live `listing` can still be shown when:

- the listing is public
- the listing is private but belongs to the current user

The live `listing.agentProfile` becomes `null` when:

- the lister agent profile is missing
- the lister agent profile is soft-deleted
- the lister account is not active

## Backend Rules

The backend always uses:

- current user id from `req.currentUser._id`
- fresh active user loaded by `requireActiveUser`
- saved listings owned by the current user only
- server-side pagination validation
- server-side live listing availability checks
- server-side active building availability checks
- server-side active lister agent profile checks

The frontend cannot choose:

- `userId`
- another user's saved listing list
- live listing availability
- building availability
- agent profile availability

## Indexes

The saved listing model has an index for this query:

```js
{ userId: 1, createdAt: -1, _id: -1 }
```

This supports user-scoped newest-first pagination.

The saved listing model also has the duplicate prevention index used by create/delete:

```js
{ userId: 1, listingId: 1 }, { unique: true }
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

### Invalid Page Range

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "page must be between 1 and 10000"
}
```

### Invalid Page Type

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "page must be a number"
}
```

### Invalid Page Integer

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "page must be an integer"
}
```

### Invalid Limit Range

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "limit must be between 1 and 100"
}
```

### Invalid Limit Type

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "limit must be a number"
}
```

### Invalid Limit Integer

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "limit must be an integer"
}
```

## Tested Checklist

Backend scenario suite:

```txt
empty user returns empty list
default query returns all saved rows
public fixture listing is populated
private own listing is visible to saver
private other listing row preserved but hidden
deleted listing row preserved but hidden
missing building listing row preserved but hidden
stale listing row preserved but hidden
pagination page 2 limit 2 works
valid high page returns empty with total
session-supported aggregate works
query must be object
invalid userId rejected
page below range rejected
page above range rejected
page non-number rejected
page non-integer rejected
limit below range rejected
limit above range rejected
limit non-number rejected
limit non-integer rejected
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
default saved listings success
page=1&limit=1 success
page=2&limit=1 success
page beyond total returns empty list with total preserved
page below range
page above range
page non-number
page non-integer
limit below range
limit above range
limit non-number
limit non-integer
missing Authorization header
malformed Authorization header
invalid access token
suspended user
inactive user
deleted/missing user
real user restored to ACTIVE after status guard tests
```
