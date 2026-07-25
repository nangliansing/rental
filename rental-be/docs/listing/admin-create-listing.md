# Admin Create Listing

> **Status: dormant and disabled.** Listings should currently use the customer pending-post
> workflow. See
> [Unused Admin Endpoint Registry](../unused-admin-endpoints.md) before
> restoring or exposing this direct creation endpoint.

Create a listing as platform owner/admin.

## Endpoint

```http
POST /api/v1/admin/listings
```

## Headers

```http
Authorization: Bearer <ADMIN_ACCESS_TOKEN>
Content-Type: application/json
```

## Request Body

```json
{
  "visibility": "PUBLIC",
  "buildingId": "6a42083acb53a8ee604f79b6",
  "isForeignerAccepted": true,
  "isTM30Provided": true,
  "rent": 5000,
  "deposit": 5000,
  "moveInCost": 10000,
  "electricRate": 8,
  "waterRate": 20,
  "bedroomCount": 1,
  "bathroomCount": 1,
  "kitchenType": "No Kitchen",
  "size": 24,
  "contractMonths": 3,
  "occupancy": 2,
  "isCookingAllowed": false,
  "isPetAllowed": false,
  "facilities": ["Wifi", "Air Conditioner", "Bed"],
  "media": [
    {
      "publicId": "rental/listings/test-room-1",
      "secureUrl": "https://res.cloudinary.com/demo/image/upload/test-room-1.jpg",
      "resourceType": "image",
      "format": "jpg",
      "width": 1200,
      "height": 800,
      "bytes": 250000,
      "position": 0,
      "alt": "Room photo",
      "isCover": true
    }
  ],
  "description": "Clean room near main road"
}
```

## Success Response

Status: `201 Created`

```json
{
  "success": true,
  "data": {
    "_id": "LISTING_ID",
    "visibility": "PUBLIC",
    "isDeleted": false,
    "deletedAt": null,
    "deletedBy": null,
    "deleteReason": null,
    "isForeignerAccepted": true,
    "isTM30Provided": true,
    "rent": 5000,
    "deposit": 5000,
    "moveInCost": 10000,
    "electricRate": 8,
    "waterRate": 20,
    "bedroomCount": 1,
    "bathroomCount": 1,
    "kitchenType": "No Kitchen",
    "size": 24,
    "contractMonths": 3,
    "occupancy": 2,
    "isCookingAllowed": false,
    "isPetAllowed": false,
    "facilities": ["Wifi", "Air Conditioner", "Bed"],
    "media": [
      {
        "publicId": "rental/listings/test-room-1",
        "secureUrl": "https://res.cloudinary.com/demo/image/upload/test-room-1.jpg",
        "resourceType": "image",
        "format": "jpg",
        "width": 1200,
        "height": 800,
        "bytes": 250000,
        "position": 0,
        "alt": "Room photo",
        "isCover": true
      }
    ],
    "description": "Clean room near main road",
    "listedBy": "ADMIN_USER_ID",
    "buildingId": "6a42083acb53a8ee604f79b6",
    "createdAt": "2026-06-30T00:00:00.000Z",
    "updatedAt": "2026-06-30T00:00:00.000Z"
  }
}
```

## Common Error Responses

### Missing Token

Status: `401 Unauthorized`

```json
{
  "success": false,
  "code": "AUTH_REQUIRED",
  "message": "Authentication required"
}
```

### Not Admin

Status: `403 Forbidden`

```json
{
  "success": false,
  "code": "FORBIDDEN",
  "message": "Forbidden"
}
```

### Building Not Found

Status: `404 Not Found`

```json
{
  "success": false,
  "code": "BUILDING_NOT_FOUND",
  "message": "Building not found"
}
```

### Invalid Input

Status: `422 Unprocessable Entity`

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid kitchenType: Shared Kitchen"
}
```

## Notes

- `media` should contain Cloudinary upload results.
- `visibility: "PUBLIC"` affects building `minRent` and `maxRent`.
- `visibility: "PRIVATE"` creates the listing but should not affect public rent summary.
