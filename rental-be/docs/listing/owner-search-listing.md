# Get My Listings

Return the authenticated user's non-deleted listings for their listing-management view.

This endpoint is owner-scoped. The caller cannot supply a user id or retrieve another user's listings.

## Endpoint

```http
GET /api/v1/listings
```

Local URL:

```http
GET http://localhost:3000/api/v1/listings
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

Suspended, inactive, deleted, or missing users cannot access this endpoint.

## Query Parameters

| Name | Required | Default | Accepted values |
| --- | --- | --- | --- |
| `page` | no | `1` | Integer from `1` to `10000` |
| `limit` | no | `20` | Integer from `1` to `100` |
| `visibility` | no | `ALL` | `ALL`, `PUBLIC`, or `PRIVATE` |
| `sort` | no | `latest` | `latest` or `oldest` |

`visibility` is trimmed and case-insensitive. For example, `private` becomes `PRIVATE`.

`sort` is trimmed and case-insensitive. `latest` sorts by `updatedAt` descending; `oldest` sorts by `updatedAt` ascending. `_id` is used as a deterministic tie-breaker.

When `visibility` is omitted or is `ALL`, both public and private listings are returned.

## Request Body

No request body is required.

## Example Request

```http
GET /api/v1/listings?page=1&limit=5&visibility=PUBLIC&sort=latest
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
    "listings": [
      {
        "_id": "6a57d0e4947d934e03495b84",
        "visibility": "PUBLIC",
        "rent": 14000,
        "deposit": 28000,
        "moveInCost": 42000,
        "bedroomCount": 1,
        "bathroomCount": 1,
        "media": [],
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
        "createdAt": "2026-07-15T18:26:44.251Z",
        "updatedAt": "2026-07-17T20:00:17.527Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 18
  }
}
```

## Response Behavior

- `data.agentProfile` is the caller's agent profile, or `null` when the caller has no agent profile.
- `data.listings` contains only records whose `listedBy` matches the authenticated user and whose `isDeleted` is `false`.
- `building` is populated when the referenced building exists. It is `null` when that lookup cannot resolve.
- Inactive buildings are preserved because owners must still be able to manage their own listings. This differs from public listing search.
- `isSavedByMe` indicates whether the authenticated caller has saved that listing.
- A valid page beyond the last result returns an empty `listings` array and preserves `pagination.total`.
- When the caller has no profile or listings, the endpoint returns `agentProfile: null`, `listings: []`, and `total: 0`.

## Backend Flow

```txt
authenticate request
require a current active user
validate query parameters
build owner-scoped match using current user id
exclude soft-deleted listings
apply optional visibility filter
sort and paginate in MongoDB
populate building and caller saved-state data
load caller agent profile in parallel
return listings, profile, and pagination
```

The user id always comes from the authenticated request. The client cannot override `listedBy`.

## Indexes

The unfiltered owner query uses:

```js
{ listedBy: 1, isDeleted: 1, updatedAt: -1, _id: 1 }
```

The visibility-filtered owner query uses:

```js
{
  listedBy: 1,
  isDeleted: 1,
  visibility: 1,
  updatedAt: -1,
  _id: 1
}
```

These indexes support owner scoping, soft-delete exclusion, visibility filtering, and latest-first pagination. MongoDB can scan an index in reverse for oldest-first sorting.

## Error Responses

All query validation errors return `422 Unprocessable Entity` with code `VALIDATION_ERROR`.

### Invalid Visibility

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid visibility: BAD"
}
```

Duplicate visibility parameters are rejected because the resulting value is not a string:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "visibility must be a string"
}
```

### Invalid Sort

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid sort: bad"
}
```

Duplicate sort parameters return `sort must be a string`.

### Invalid Pagination

Possible messages:

```txt
page must be between 1 and 10000
page must be a number
page must be an integer
limit must be between 1 and 100
limit must be a number
limit must be an integer
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

Backend scenario suite: `30/30` passed.

```txt
default query and default pagination
agent profile present and absent
PUBLIC, PRIVATE, and ALL visibility filters
case normalization
latest and oldest ordering
valid pagination and page beyond total
caller with no listings
caller ownership enforcement
soft-deleted listing exclusion
invalid query and session inputs
invalid actor id
invalid visibility value and type
invalid sort value and type
page minimum, maximum, numeric, and integer validation
limit minimum, maximum, numeric, and integer validation
active user accepted
missing and malformed Authorization header
invalid access token
suspended user
inactive user
missing user
```

Postman checklist:

```txt
active user login
default owner listing response
PUBLIC filter
PRIVATE filter
explicit lowercase all filter
latest sorting
oldest sorting
second page pagination
page beyond total
invalid visibility value and duplicate visibility parameters
invalid sort value and duplicate sort parameters
page below minimum and above maximum
page non-number and non-integer
limit below minimum and above maximum
limit non-number and non-integer
missing Authorization header
empty bearer token
invalid access token
user with no agent profile and no listings
suspended user
inactive user
missing user
temporary user states and records restored after testing
```
