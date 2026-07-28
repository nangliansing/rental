# Get Public Listing Detail

Get one public listing by id.

This endpoint is public. Authentication is optional and is only used to calculate `isSavedByMe`.

## Endpoint

```http
GET /api/v1/search/listings/:listingId
```

Full local URL:

```http
GET http://localhost:3000/api/v1/search/listings/6a57d0e4947d934e03495b84
```

## Headers

No header is required.

Optional:

```http
Authorization: Bearer ACCESS_TOKEN
```

## Optional Auth Behavior

| Token / user state | Behavior |
| --- | --- |
| No token | Allow as anonymous |
| Invalid or expired access token | Allow as anonymous |
| Refresh token sent as bearer token | Allow as anonymous |
| Valid token, user `ACTIVE` | Allow as authenticated viewer |
| Valid token, user `SUSPENDED` | Allow as anonymous |
| Valid token, user `INACTIVE` | Allow as anonymous |
| Valid token, user deleted or missing | Allow as anonymous |

Anonymous viewers always get:

```json
{
  "isSavedByMe": false
}
```

## Request Body

No request body is required.

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
      "availableAt": "2026-08-14T17:00:00.000Z",
      "isDeleted": false,
      "deletedAt": null,
      "deletedBy": null,
      "deleteReason": null,
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
        "isActive": true,
        "minRent": 13000,
        "maxRent": 15000
      },
      "agentProfile": {
        "_id": "6a5669f81a9630e315e059a7",
        "userId": "6a5638bafc6d6328c9e1b281",
        "displayName": "Patch Restored Agent",
        "profilePhoto": null,
        "phone": "+66899999999",
        "lineUrl": null,
        "whatsappPhone": null,
        "telegramUrl": null,
        "viberPhone": null,
        "supportLanguages": ["English", "Thai"],
        "isVerified": false,
        "isOnline": true,
        "reviewSummary": {
          "averageRating": 0,
          "reviewCount": 0,
          "ratingCounts": {
            "oneStar": 0,
            "twoStars": 0,
            "threeStars": 0,
            "fourStars": 0,
            "fiveStars": 0
          },
          "tagCounts": []
        }
      },
      "isSavedByMe": false,
      "createdAt": "2026-07-15T18:26:44.251Z",
      "updatedAt": "2026-07-15T18:26:44.251Z"
    }
  }
}
```

## Availability Rules

The listing is returned only when all of these are true:

- listing exists
- listing `visibility` is `PUBLIC`
- listing `isDeleted` is `false`
- linked building exists
- linked building `isActive` is `true`
- lister has a non-deleted agent profile
- lister user exists
- lister user `status` is `ACTIVE`

These agent profile fields are display-only and do not hide the listing:

- `agentProfile.isVerified`
- `agentProfile.isOnline`

So unverified or offline agents can still have public listings.

`listing.availableAt` is always present as `null` or an ISO datetime. See [`../listing/available-at-response.md`](../listing/available-at-response.md).

## isSavedByMe

`isSavedByMe` is based on the optional viewer token.

- anonymous viewer: `false`
- invalid token: `false`
- suspended/inactive/missing viewer user: `false`
- active viewer who saved the listing: `true`
- active viewer who did not save the listing: `false`

Saving your own listing is allowed, so `isSavedByMe` can be `true` for the lister too.

## Errors

Invalid `listingId`:

Status:

```http
422 Unprocessable Entity
```

Body:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "listingId must be a valid id"
}
```

Listing unavailable:

Status:

```http
404 Not Found
```

Body:

```json
{
  "success": false,
  "code": "LISTING_NOT_FOUND",
  "message": "Listing not found"
}
```

The endpoint returns `LISTING_NOT_FOUND` when the listing does not exist or is hidden by any availability rule.

Examples:

- listing is deleted
- listing is private
- building is missing
- building is inactive
- agent profile is missing
- agent profile is deleted
- lister user is missing
- lister user is suspended
- lister user is inactive

## Tested Scenarios

- anonymous viewer returns `200`
- active authenticated viewer returns `200`
- saved listing returns `isSavedByMe: true`
- invalid access token returns `200` as anonymous
- refresh token sent as bearer token returns `200` as anonymous
- invalid `listingId` returns `422`
- non-existing listing returns `404`
- deleted listing returns `404`
- private listing returns `404`
- inactive building returns `404`
- deleted agent profile returns `404`
- suspended lister returns `404`
- inactive lister returns `404`
- missing lister user returns `404`
- unverified agent still returns `200`
- offline agent still returns `200`
- suspended viewer still returns `200` as anonymous
- inactive viewer still returns `200` as anonymous
