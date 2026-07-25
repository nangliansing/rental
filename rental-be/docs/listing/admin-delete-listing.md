# Admin Delete Listing

Soft-delete a listing by platform owner/admin.

This endpoint is admin-only. It lets an `OWNER` or `ADMIN` remove a listing after moderation. The listing document is not hard-deleted; it is marked deleted and hidden from public search.

## Endpoint

```http
DELETE /api/v1/admin/listings/:listingId
```

Full local URL:

```http
DELETE http://localhost:3000/api/v1/admin/listings/6a5bd9ec5f61b72740e80292
```

## Headers

```http
Authorization: Bearer OWNER_OR_ADMIN_ACCESS_TOKEN
Content-Type: application/json
```

## Path Params

```txt
listingId  required, valid listing id
```

## Request Body

```json
{
  "reason": "Temporary Postman admin delete listing test."
}
```

Fields:

```txt
reason  required, non-empty string, max 500 characters
```

## Auth Rules

Request is allowed only when:

- token is valid
- token user exists
- token user status is `ACTIVE`
- token user role is `OWNER` or `ADMIN`

## Business Rules

Only non-deleted listings can be deleted:

```js
{
  _id: listingId,
  isDeleted: { $ne: true }
}
```

Missing or already deleted listings return `LISTING_NOT_FOUND`.

Delete is a soft delete:

```json
{
  "isDeleted": true,
  "visibility": "PRIVATE",
  "deletedAt": "now",
  "deletedBy": "OWNER_OR_ADMIN_USER_ID",
  "deleteReason": "admin reason"
}
```

The update is atomic. The backend first loads the listing for context, then updates with a guarded `findOneAndUpdate` that still requires `isDeleted: { $ne: true }`. This protects against two admins deleting the same listing at the same time.

After delete, the backend recalculates the building rent summary so public building min/max rent no longer includes the removed listing.

## Notifications

The listing owner receives one notification after the listing is removed.

Notification creation happens inside the transaction. Socket emission happens only after the transaction commits.

Notification copy is intentionally simple and user-friendly:

```txt
Your listing at Bangkapi Protected Field Residence was removed after moderation. Reason: Temporary Postman admin delete listing test.
```

If the building is missing, the message falls back to a compact listing label.

Notification metadata:

```json
{
  "listingId": "6a5bd9ec5f61b72740e80292",
  "buildingId": "6a57c6da947d934e03495b7a",
  "listingLabel": "listing at Bangkapi Protected Field Residence",
  "reason": "Temporary Postman admin delete listing test."
}
```

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
    "_id": "6a5bd9ec5f61b72740e80292",
    "visibility": "PRIVATE",
    "isForeignerAccepted": true,
    "isTM30Provided": true,
    "rent": 99999,
    "deposit": 199998,
    "moveInCost": 299997,
    "electricRate": 8,
    "waterRate": 20,
    "bedroomCount": 1,
    "bathroomCount": 1,
    "kitchenType": "Kitchen",
    "size": 30,
    "contractMonths": 12,
    "occupancy": 2,
    "isCookingAllowed": true,
    "isPetAllowed": false,
    "facilities": ["Air Conditioner"],
    "media": [
      {
        "publicId": "tmp/postman-admin-delete-listing",
        "secureUrl": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        "resourceType": "image",
        "format": "jpg",
        "width": 800,
        "height": 600,
        "bytes": 120000,
        "position": 0,
        "alt": "Temporary admin delete listing test room",
        "isCover": true
      }
    ],
    "description": "TEMP Postman admin delete listing test",
    "isDeleted": true,
    "deletedAt": "2026-07-18T19:55:07.972Z",
    "deletedBy": "6a5638c8fc6d6328c9e1b282",
    "deleteReason": "Temporary Postman admin delete listing test.",
    "listedBy": "6a5638c8fc6d6328c9e1b282",
    "buildingId": "6a57c6da947d934e03495b7a",
    "createdAt": "2026-07-18T19:54:20.454Z",
    "updatedAt": "2026-07-18T19:55:07.973Z"
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

Non-admin user:

```http
403 Forbidden
```

```json
{
  "success": false,
  "code": "FORBIDDEN",
  "message": "Forbidden"
}
```

Suspended admin:

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

Inactive admin:

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

Missing token user:

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

Invalid `listingId`:

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

Listing not found or already deleted:

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

Missing reason:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reason is required"
}
```

Reason too long:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reason must be at most 500 characters"
}
```

Body is not an object:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "body must be an object"
}
```

Invalid JSON:

```http
400 Bad Request
```

```json
{
  "success": false,
  "code": "INVALID_JSON",
  "message": "Request body must be valid JSON"
}
```

## Tested Checklist

Automated smoke test covered:

- success soft-delete
- `isDeleted: true`
- `visibility: PRIVATE`
- `deletedAt`, `deletedBy`, `deleteReason`
- listing-owner notification creation
- simple notification copy
- building rent summary recalculation
- already deleted listing returns `LISTING_NOT_FOUND`
- listing not found
- invalid `listingId`
- body must be object
- missing `reason`
- empty `reason`
- `reason` over 500 characters

Postman test covered:

- owner/admin login
- temporary listing creation
- successful admin soft delete
- already deleted returns `LISTING_NOT_FOUND`
- invalid `listingId`
- missing listing
- missing `reason`
- empty `reason`
- `reason` too long
- body must be object
- invalid JSON
- missing token
- malformed bearer
- invalid token
- non-admin forbidden
- suspended admin
- inactive admin
- missing/deleted admin user

Temporary Postman listing and notification were hard-removed after testing.

## Implementation Notes

Backend files:

```txt
modules/listing/admin-listing.routes.js
modules/listing/controllers/admin-delete-listing.controller.js
modules/listing/services/admin-delete-listing.service.js
modules/listing/listing.model.js
modules/building/services/update-building-rent-summary.service.js
```

The frontend admin report flow uses this endpoint when an admin takes action on a reported listing.
