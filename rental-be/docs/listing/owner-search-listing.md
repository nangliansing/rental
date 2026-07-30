# Get My Listings

Return the authenticated user's non-deleted listings for their listing-management view.

This endpoint is owner-scoped. The caller cannot supply a user id or retrieve another user's listings.

Owner profile tabs map to the `filter` query parameter:

| Tab | `filter` |
| --- | --- |
| All | `all` |
| Now | `now` |
| Soon | `soon` |
| Private | `private` |

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
| `filter` | no | `all` | `all`, `now`, `soon`, or `private` |
| `visibility` | no | `ALL` | `ALL`, `PUBLIC`, or `PRIVATE` (legacy; ignored when `filter` is present) |
| `sort` | no | `latest` | `latest` or `oldest` |

### Filters

`filter` is trimmed and case-insensitive. For example, `NOW` becomes `now`.

Availability boundaries use the Thailand calendar (`Asia/Bangkok`, UTC+7). See [`available-at-response.md`](./available-at-response.md) for how `availableAt` is stored and serialized.

| Filter | Meaning |
| --- | --- |
| `all` | All non-deleted listings owned by the caller (public and private, any `availableAt`) |
| `now` | Public listings with a set `availableAt` on or before today (Bangkok calendar) |
| `soon` | Public listings with `availableAt` on or after tomorrow (Bangkok calendar) |
| `private` | All private listings |

Mongo match constraints applied per filter:

| Filter | Match fields |
| --- | --- |
| `all` | none beyond `{ listedBy, isDeleted: false }` |
| `now` | `visibility: PUBLIC`, `availableAt: { $ne: null, $lt: startOfTomorrowBangkok }` |
| `soon` | `visibility: PUBLIC`, `availableAt: { $gte: startOfTomorrowBangkok }` |
| `private` | `visibility: PRIVATE` |

Rules:

- Flexible public listings (`availableAt: null`) appear only under `all`, not `now` or `soon`.
- `now` and `soon` never return private listings.
- `private` returns all private listings regardless of `availableAt`.

### Legacy `visibility`

`visibility` is trimmed and case-insensitive. For example, `private` becomes `PRIVATE`.

When `filter` is **absent**, legacy clients may still restrict results by public/private visibility:

| `visibility` | Meaning |
| --- | --- |
| `ALL` | Public and private listings (default when omitted) |
| `PUBLIC` | Public listings only |
| `PRIVATE` | Private listings only |

When `filter` is **present**, `visibility` is ignored. For example, `?filter=private&visibility=PUBLIC` returns private listings only.

### Sorting

`sort` is trimmed and case-insensitive.

| Filter | Primary sort | Tie-breakers |
| --- | --- | --- |
| `all`, `now`, `private` | `createdAt` (`latest` → descending, `oldest` → ascending) | `_id` |
| `soon` | `availableAt` ascending (soonest availability first) | `createdAt`, then `_id` |

For `filter=soon`, the requested `sort` value applies only as a tie-breaker when multiple listings share the same availability date.

Mongo sort shapes:

```js
// filter=all | now | private, sort=latest
{ createdAt: -1, _id: 1 }

// filter=all | now | private, sort=oldest
{ createdAt: 1, _id: -1 }

// filter=soon, sort=latest
{ availableAt: 1, createdAt: -1, _id: 1 }

// filter=soon, sort=oldest
{ availableAt: 1, createdAt: 1, _id: -1 }
```

### Pagination

- `page` defaults to `1`.
- `limit` defaults to `20`.
- A valid page beyond the last result returns an empty `listings` array and preserves `pagination.total`.

## Request Body

No request body is required.

## Example Requests

Default owner listing query:

```http
GET /api/v1/listings
Authorization: Bearer ACCESS_TOKEN
```

Available-now tab:

```http
GET /api/v1/listings?filter=now&sort=latest
Authorization: Bearer ACCESS_TOKEN
```

Available-soon tab (sorted by availability date):

```http
GET /api/v1/listings?filter=soon&sort=latest
Authorization: Bearer ACCESS_TOKEN
```

Private tab with pagination:

```http
GET /api/v1/listings?filter=private&page=1&limit=5
Authorization: Bearer ACCESS_TOKEN
```

Legacy public-only query (no `filter` param):

```http
GET /api/v1/listings?visibility=PUBLIC&sort=latest
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
        "availableAt": null,
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
- Each listing includes `availableAt` (`null` or an ISO datetime). See [`available-at-response.md`](./available-at-response.md).
- `building` is populated when the referenced building exists. It is `null` when that lookup cannot resolve.
- Inactive buildings are preserved because owners must still be able to manage their own listings. This differs from public listing search.
- `isSavedByMe` indicates whether the authenticated caller has saved that listing.
- A valid page beyond the last result returns an empty `listings` array and preserves `pagination.total`.
- When the caller has no profile or listings, the endpoint returns `agentProfile: null`, `listings: []`, and `total: 0`.

## Backend Flow

```txt
authenticate request
require a current active user
validate query parameters (page, limit, filter, sort, legacy visibility)
build owner-scoped match: { listedBy, isDeleted: false }
apply listing filter (filter takes precedence over legacy visibility)
build Mongo sort (availableAt-first when filter=soon, otherwise createdAt-first)
sort and paginate in MongoDB
populate building and caller saved-state data
load caller agent profile in parallel
return listings, profile, and pagination
```

Implementation utilities:

- `applyOwnerListingFilterToMatch` — applies `filter` or legacy `visibility` to the Mongo match
- `buildOwnerListingSort` — builds the Mongo `$sort` object

The user id always comes from the authenticated request. The client cannot override `listedBy`.

## Indexes

The unfiltered owner query uses:

```js
{ listedBy: 1, isDeleted: 1, createdAt: -1, _id: 1 }
```

The visibility-filtered owner query uses:

```js
{
  listedBy: 1,
  isDeleted: 1,
  visibility: 1,
  createdAt: -1,
  _id: 1
}
```

The owner `soon` query uses:

```js
{
  listedBy: 1,
  isDeleted: 1,
  visibility: 1,
  availableAt: 1,
  createdAt: -1,
  _id: 1
}
```

These indexes support owner scoping, soft-delete exclusion, visibility filtering, availability sorting, and latest-first pagination by listing creation time. MongoDB can scan an index in reverse for oldest-first sorting.

## Error Responses

All query validation errors return `422 Unprocessable Entity` with code `VALIDATION_ERROR`.

### Invalid Filter

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid filter: BAD"
}
```

Duplicate filter parameters are rejected because the resulting value is not a string:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "filter must be a string"
}
```

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

Backend integration suite: `test/owner-search-listings.fetch.integration.test.js` — `30/30` passed.

Unit suites:

- `test/owner-listing-filter.test.js` — `4/4` passed
- `test/owner-listing-sort.test.js` — `2/2` passed

```txt
default query and default pagination
agent profile present and absent
filter=all, now, soon, private
filter case normalization and precedence over legacy visibility
legacy PUBLIC, PRIVATE, and ALL visibility filters
sort=latest and sort=oldest for non-soon filters
filter=soon sorts by availableAt ascending with createdAt tie-breakers
valid pagination, second page, and page beyond total
caller with no listings
caller ownership enforcement
soft-deleted listing exclusion
flexible public listings excluded from now and soon
response includes building, availableAt, and isSavedByMe
invalid filter, visibility, sort, page, and limit values
duplicate filter parameters rejected
missing and invalid access token
suspended user
inactive user
missing user
```

Postman checklist:

```txt
active user login
default owner listing response
filter=all, now, soon, private
legacy PUBLIC and PRIVATE visibility filters
filter=soon availability-date ordering
latest and oldest sorting
second page pagination
page beyond total
invalid filter, visibility, and sort values
duplicate filter parameters
page below minimum and above maximum
limit below minimum and above maximum
missing Authorization header
empty bearer token
invalid access token
user with no agent profile and no listings
suspended user
inactive user
missing user
temporary user states and records restored after testing
```
