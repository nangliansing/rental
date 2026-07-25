# Update My Listing

Partially update a non-deleted listing owned by the authenticated user.

The endpoint accepts only explicitly supported listing fields. Ownership, building association, deletion metadata, and timestamps are controlled by the backend.

## Endpoint

```http
PATCH /api/v1/listings/:listingId
```

Local example:

```http
PATCH http://localhost:3000/api/v1/listings/6a57d0e4947d934e03495b84
```

## Authentication

Requires an access token for an active user.

```http
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

The route uses:

```txt
authenticate
requireActiveUser
```

Suspended, inactive, or missing users are rejected before the listing is updated.

## Path Parameters

| Name | Required | Validation |
| --- | --- | --- |
| `listingId` | yes | Valid MongoDB ObjectId |

## Request Body

The body must be a JSON object containing at least one actual change.

Send only the fields that should change:

```json
{
  "rent": 14000,
  "deposit": 28000,
  "visibility": "PUBLIC",
  "facilities": ["Air Conditioner", "Balcony"],
  "description": "Updated listing description"
}
```

### Editable Fields

| Field | Validation |
| --- | --- |
| `visibility` | `PUBLIC` or `PRIVATE` |
| `isForeignerAccepted` | boolean |
| `isTM30Provided` | boolean |
| `rent` | number from `0` to `Number.MAX_SAFE_INTEGER` |
| `deposit` | number from `0` to `Number.MAX_SAFE_INTEGER` |
| `moveInCost` | number from `0` to `Number.MAX_SAFE_INTEGER` |
| `electricRate` | `null` or number from `0` to `50` |
| `waterRate` | `null` or number from `0` to `100` |
| `bedroomCount` | integer from `0` to `20` |
| `bathroomCount` | integer from `0` to `20` |
| `kitchenType` | `No Kitchen`, `Kitchen`, or `Separate Kitchen` |
| `size` | `null` or number from `0` to `Number.MAX_SAFE_INTEGER` |
| `contractMonths` | number from `1` to `60` |
| `occupancy` | number from `1` to `50` |
| `isCookingAllowed` | boolean |
| `isPetAllowed` | boolean |
| `facilities` | array containing only supported listing facilities |
| `media` | validated media array, maximum 20 items |
| `description` | `null` or string, maximum 3000 characters; blank becomes `null` |

Valid listing facilities:

```txt
Wifi
TV
Air Conditioner
Fan
Refrigerator
Microwave
Washing Machine
Water Heater
Desk
Chair
Wardrobe
Bed
Sofa
Balcony
Private Bathroom
Cooking Equipment
```

### Media Shape

```json
{
  "media": [
    {
      "publicId": "listings/example-room",
      "secureUrl": "https://res.cloudinary.com/example/image/upload/room.jpg",
      "resourceType": "image",
      "format": "jpg",
      "width": 800,
      "height": 600,
      "bytes": 120000,
      "position": 0,
      "alt": "Room photo",
      "isCover": true
    }
  ]
}
```

Media rules:

- `publicId` and `secureUrl` are required strings.
- At most 20 media items are accepted.
- At most one item may have `isCover: true`.
- Numeric media properties cannot be negative.
- `alt` is optional and limited to 255 characters.

## Protected Fields

These fields cannot be updated through this endpoint:

```txt
_id
listedBy
buildingId
isDeleted
deletedAt
deletedBy
deleteReason
createdAt
updatedAt
```

Unknown and protected fields are rejected. They are not silently ignored.

Example:

```json
{
  "listedBy": "6a567af318a65af44ed99cde"
}
```

Response:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Unknown fields: listedBy"
}
```

If a request contains both valid and unknown fields, the entire request is rejected. No partial update is applied.

## No-Change Behavior

The backend compares every validated value with the stored listing.

An empty object or a request containing only existing values returns:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "NO_VALID_CHANGE",
  "message": "No valid change"
}
```

Arrays and media objects are compared by value. A request that submits an unchanged array is also a no-op.

## Ownership And Availability

The listing must match:

```js
{
  _id: listingId,
  listedBy: currentUserId,
  isDeleted: false
}
```

The endpoint can update both `PUBLIC` and `PRIVATE` owner listings.

The following cases all return the same `LISTING_NOT_FOUND` response:

- listing does not exist
- listing belongs to another user
- listing is soft-deleted

Using one response prevents disclosure of another user's listing or ownership information.

## Rent Summary

When `rent` or `visibility` actually changes, the endpoint recalculates the related building's summary from all public, non-deleted listings:

```js
{
  minRent: minimumPublicListingRent,
  maxRent: maximumPublicListingRent
}
```

Changing a listing to `PRIVATE` removes its rent from the summary. Changing it to `PUBLIC` adds it back.

Updates to unrelated fields do not trigger this recalculation.

## Transaction Behavior

The listing update and any required building rent-summary update run in the same MongoDB transaction.

- A request-scoped session is reused when supplied.
- Otherwise, the service creates and closes its own transaction session.
- If either write fails, both writes roll back.

## Backend Flow

```txt
authenticate the access token
load and require the current active user
validate listingId, actorId, and session
match an owned, non-deleted listing
validate the request object and strict editable-field allowlist
remove values that are unchanged
reject the request when no actual change remains
atomically update with ownership and deletion predicates
recalculate the building rent summary when required
commit the transaction
return the updated listing
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
    "media": [],
    "description": "Updated listing description",
    "isDeleted": false,
    "deletedAt": null,
    "deletedBy": null,
    "deleteReason": null,
    "listedBy": "6a5638bafc6d6328c9e1b281",
    "buildingId": "6a57c6da947d934e03495b7a",
    "createdAt": "2026-07-15T18:26:44.251Z",
    "updatedAt": "2026-07-20T02:36:15.649Z"
  }
}
```

The mutation response contains the updated listing record. It does not populate the building or agent profile. Use `GET /api/v1/listings/:listingId` when the enriched owner-detail response is needed.

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

### Body Is Not An Object

Status: `422 Unprocessable Entity`

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "body must be an object"
}
```

### Invalid Field

Status: `422 Unprocessable Entity`

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid visibility: BAD"
}
```

Other field validation errors use the same code with a field-specific message, such as:

```txt
rent must be a number
rent must be between 0 and 9007199254740991
isPetAllowed must be a boolean
bedroomCount must be an integer
Invalid facilities: Swimming Pool
media.0.publicId must be a string
description must be at most 3000 characters
```

### Unknown Field

Status: `422 Unprocessable Entity`

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Unknown fields: rnet"
}
```

### No Valid Change

Status: `422 Unprocessable Entity`

```json
{
  "success": false,
  "code": "NO_VALID_CHANGE",
  "message": "No valid change"
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

This response also covers non-owned and soft-deleted listings.

### Invalid JSON

Status: `400 Bad Request`

```json
{
  "success": false,
  "code": "INVALID_JSON",
  "message": "Request body must be valid JSON"
}
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

An absent header and an empty bearer token return the same response.

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

### User Not Found

Status: `404 Not Found`

```json
{
  "success": false,
  "code": "USER_NOT_FOUND",
  "message": "User not found"
}
```

## Indexes

No new index is required.

MongoDB uses the listing `_id` index first. Ownership and deletion predicates are then checked against that single candidate:

```js
{
  _id: listingId,
  listedBy: currentUserId,
  isDeleted: false
}
```

The building summary service uses the existing listing index beginning with:

```js
{
  buildingId: 1,
  isDeleted: 1,
  visibility: 1
}
```

## Tested Checklist

Automated MongoDB integration suite: `38/38` passed.

```txt
all editable fields
partial update preservation
media update
same scalar value
same array value
empty body
unknown field
protected fields
malformed listing id
nonexistent listing
non-owned listing privacy
soft-deleted listing
all validator families and boundaries
rent-summary recalculation
visibility-summary recalculation
non-summary field update
existing transaction session
transaction rollback
fixture cleanup
```

Postman HTTP flow completed:

```txt
owner login
partial update
same-value update
multiple field types
media array update
rent update and summary verification
private visibility and summary exclusion
empty, null, array, and malformed JSON bodies
unknown and protected fields
invalid and nonexistent listing ids
non-owner privacy response
missing, empty, and invalid access tokens
suspended, inactive, and missing users
field type, enum, range, integer, facility, and media validation
soft-deleted owner listing
mixed valid and unknown fields with no partial write
complete fixture restoration
final building summary restoration
```

Final fixture state:

```txt
Test Normal User: ACTIVE
listing visibility: PUBLIC
listing rent: 14000
building minRent: 13000
building maxRent: 15000
temporary deleted listing: removed
```
