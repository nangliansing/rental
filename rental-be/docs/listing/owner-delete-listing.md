# Delete My Listing

Soft-delete a non-deleted listing owned by the authenticated user.

The listing record is retained for audit and relational integrity. It is made private and excluded from public listing queries and building rent summaries.

## Endpoint

```http
DELETE /api/v1/listings/:listingId
```

Local example:

```http
DELETE http://localhost:3000/api/v1/listings/6a57d0e4947d934e03495b84
```

## Authentication

Requires an access token for an active user:

```http
Authorization: Bearer ACCESS_TOKEN
```

The route uses:

```txt
authenticate
requireActiveUser
```

The backend reloads the caller from the database. Suspended, inactive, or missing users are rejected even when their access token is otherwise valid.

## Path Parameters

| Name | Required | Validation |
| --- | --- | --- |
| `listingId` | yes | Valid MongoDB ObjectId |

## Query Parameters

None.

## Request Body

No request body is defined or required. Clients should omit it and should not send `Content-Type: application/json` unless a body is actually present.

Recommended request:

```http
DELETE /api/v1/listings/6a57d0e4947d934e03495b84
Authorization: Bearer ACCESS_TOKEN
```

Malformed JSON is rejected by the global JSON parser before the controller runs.

## Ownership And Availability

The listing must match all of the following:

```js
{
  _id: listingId,
  listedBy: currentUserId,
  isDeleted: false
}
```

The endpoint can delete an owned `PUBLIC` or `PRIVATE` listing.

These cases all return the same `LISTING_NOT_FOUND` response:

- the listing does not exist
- the listing belongs to another user
- the listing is already soft-deleted

Using one response prevents disclosure of another user's listing or ownership information. A repeated delete therefore returns `404` rather than reporting success again.

## Soft-Delete Behavior

The endpoint atomically applies:

```js
{
  isDeleted: true,
  visibility: "PRIVATE",
  deletedAt: currentDate,
  deletedBy: currentUserId,
  deleteReason: null
}
```

`deleteReason` is `null` because this is an owner-initiated action. The separate admin delete endpoint records a moderation reason.

The endpoint does not permanently remove the listing and does not delete its media from cloud storage.

## Building Rent Summary

After soft deletion, the related building's rent summary is recalculated from its remaining public, non-deleted listings:

```js
{
  minRent: minimumPublicListingRent,
  maxRent: maximumPublicListingRent
}
```

If no public listings remain, both values become `null`:

```json
{
  "minRent": null,
  "maxRent": null
}
```

## Transaction Behavior

The listing soft delete and building rent-summary update run in the same MongoDB transaction.

- A request-scoped session is reused when supplied.
- Otherwise, the service creates and closes its own transaction session.
- If the summary update fails, the listing deletion is rolled back.

## Saved Listings

Saved-listing records are not cascade-deleted. They retain their stored snapshot, while the saved-listing lookup no longer exposes the deleted live listing.

For a saved record referencing a deleted listing, its enriched `listing` value is `null`. This preserves history without making deleted inventory available again.

## Notifications

No notification is created. The listing owner initiated the action, so notifying the same user would be redundant.

## Backend Flow

```txt
authenticate the access token
load and require the current active user
validate listingId, actorId, and optional session
start or reuse a MongoDB transaction
atomically match an owned, non-deleted listing
set the listing to deleted and private
return LISTING_NOT_FOUND when no eligible listing matches
recalculate the building rent summary
commit the transaction
return the soft-deleted listing
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
    "visibility": "PRIVATE",
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
    "description": "Listing description",
    "isDeleted": true,
    "deletedAt": "2026-07-20T02:59:07.575Z",
    "deletedBy": "6a5638bafc6d6328c9e1b281",
    "deleteReason": null,
    "listedBy": "6a5638bafc6d6328c9e1b281",
    "buildingId": "6a57c6da947d934e03495b7a",
    "createdAt": "2026-07-15T18:26:44.251Z",
    "updatedAt": "2026-07-20T02:59:07.576Z"
  }
}
```

The mutation response contains the listing record without populated building or agent-profile data.

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

This response also covers non-owned and already-deleted listings.

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

MongoDB first uses the listing collection's unique `_id` index. Ownership and deletion predicates are then checked against that single candidate:

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

Automated MongoDB integration suite: `13/13` passed.

```txt
malformed listingId
malformed actorId
invalid session type
unknown valid listingId
non-owner privacy response
non-owner attempt leaves listing unchanged
already-deleted listing
soft-delete metadata
rent-summary recalculation
repeat deletion
last public listing clears summary
transaction rollback when summary update fails
controller currentUser identity and supplied-session reuse
```

Postman DELETE flow: `14/14` endpoint scenarios passed.

```txt
successful soft deletion
second successful deletion for the final public listing
repeat deletion
malformed listingId
unknown valid listingId
already-deleted listing
non-owner privacy response
missing Authorization header
empty bearer token
invalid access token
suspended user
inactive user
missing user
malformed JSON
```

Supporting building-summary verification: `2/2` requests passed.

```txt
remaining public listing produced minRent and maxRent of 22222
deleting the final public listing cleared minRent and maxRent to null
```

Final fixture verification:

```txt
non-owner fixture remained unchanged
normal test user restored to ACTIVE
temporary listings: 0
temporary buildings: 0
disposable users: 0
```
