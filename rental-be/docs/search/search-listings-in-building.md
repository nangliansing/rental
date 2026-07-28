# Search Listings In Building

Search public listings inside one active building.

Authentication is optional and is only used to calculate listing `isSavedByMe`.

Each returned listing includes `availableAt`. See [`../listing/available-at-response.md`](../listing/available-at-response.md).

Date search filter: `availableBy`. See [`../listing/available-by-filter.md`](../listing/available-by-filter.md).

## Endpoint

```http
POST /api/v1/search/buildings/:buildingId/listings
```

Full local URL:

```http
POST http://localhost:3000/api/v1/search/buildings/:buildingId/listings
```

Example:

```http
POST http://localhost:3000/api/v1/search/buildings/6a57c6da947d934e03495b7a/listings
```

## Headers

Required:

```http
Content-Type: application/json
```

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

```json
{
  "page": 1,
  "limit": 20
}
```

Defaults:

- `page`: `1`
- `limit`: `20`

Limits:

- `page`: `1` to `10000`
- `limit`: `1` to `100`

## Optional Filters

```json
{
  "minRent": 14000,
  "maxRent": 20000,
  "listingFacilities": ["Air Conditioner", "Balcony"],
  "kitchenType": "Kitchen",
  "contractMonths": 3,
  "occupancy": 2,
  "bedroomCount": 1,
  "bathroomCount": 1,
  "isForeignerAccepted": true,
  "isTM30Provided": true,
  "isCookingAllowed": true,
  "isPetAllowed": false,
  "availableBy": "2026-08-15",
  "supportLanguages": ["English"],
  "agentProfileIds": ["6a5669f81a9630e315e059a7"],
  "page": 1,
  "limit": 20
}
```

`listerIds` is also accepted as an alias for `agentProfileIds`.

Do not send both `agentProfileIds` and `listerIds` in the same request.

Filter behavior:

- `listingFacilities` uses `all` matching.
- `kitchenType: "Kitchen"` matches both `"Kitchen"` and `"Separate Kitchen"`.
- `contractMonths` means listing contract months must be less than or equal to the requested value.
- `occupancy` means listing occupancy must be greater than or equal to the requested value.
- `bedroomCount: 0` means exactly studio/no bedroom.
- `bedroomCount > 0` means greater than or equal to the requested value.
- `availableBy` keeps Flexible listings and listings available on or before that Thailand date. See [`../listing/available-by-filter.md`](../listing/available-by-filter.md).
- `supportLanguages` uses OR matching.
- `agentProfileIds` filters listings by the lister's agent profile.

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
      "maxRent": 15000
    },
    "listings": [
      {
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
          "isOnline": true
        },
        "isSavedByMe": false,
        "createdAt": "2026-07-15T18:26:44.251Z",
        "updatedAt": "2026-07-15T18:26:44.251Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

## No Matching Listings

If the building exists and is active, but filters match no listings, the building still returns.

Status:

```http
200 OK
```

Body:

```json
{
  "success": true,
  "data": {
    "building": {
      "_id": "6a57c6da947d934e03495b7a",
      "name": "Bangkapi Protected Field Residence"
    },
    "listings": []
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0
  }
}
```

## Availability Rules

The building is returned only when:

- `buildingId` is valid
- building exists
- building `isActive` is `true`

Listings are returned only when all of these are true:

- listing belongs to the building
- listing matches listing filters
- listing `visibility` is `PUBLIC`
- listing `isDeleted` is `false`
- lister has a non-deleted agent profile
- lister user exists
- lister user `status` is `ACTIVE`

These agent profile fields are display-only and do not hide listings:

- `agentProfile.isVerified`
- `agentProfile.isOnline`

So unverified or offline agents can still have public listings.

## isSavedByMe

Each returned listing includes `isSavedByMe`.

- anonymous viewer: `false`
- invalid token: `false`
- refresh token sent as bearer token: `false`
- suspended/inactive/missing viewer user: `false`
- active viewer who saved the listing: `true`
- active viewer who did not save the listing: `false`

Saving your own listing is allowed, so `isSavedByMe` can be `true` for the lister too.

## Errors

Invalid JSON:

Status:

```http
400 Bad Request
```

Body:

```json
{
  "success": false,
  "code": "INVALID_JSON",
  "message": "Request body must be valid JSON"
}
```

Body is not an object:

Status:

```http
422 Unprocessable Entity
```

Body:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "body must be an object"
}
```

Invalid building id:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "buildingId must be a valid id"
}
```

Building not found or inactive:

```json
{
  "success": false,
  "code": "BUILDING_NOT_FOUND",
  "message": "Building not found"
}
```

Invalid page:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "page must be between 1 and 10000"
}
```

Invalid limit:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "limit must be between 1 and 100"
}
```

Invalid enum value:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid kitchenType: Outdoor Kitchen"
}
```

Invalid facility:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid facilities: Air conditioning"
}
```

Invalid rent range:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "maxRent must be greater than or equal to minRent"
}
```

Conflicting lister filters:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Use either agentProfileIds or listerIds, not both"
}
```

## Tested Scenarios

- base anonymous request returns `200`
- pagination page 1/page 2 works
- page beyond available listings returns `200` with `listings: []`
- rent filter works
- no matching listing filter returns active building with `listings: []`
- matching `agentProfileIds` returns expected listings
- non-matching `agentProfileIds` returns active building with `listings: []`
- matching `supportLanguages` returns expected listings
- non-matching `supportLanguages` returns active building with `listings: []`
- listing facilities filter uses `all` matching
- kitchen type `"Kitchen"` works
- boolean filters work
- authenticated viewer can get `isSavedByMe: true`
- invalid access token returns `200` as anonymous
- suspended viewer returns `200` as anonymous
- inactive viewer returns `200` as anonymous
- missing viewer user returns `200` as anonymous
- invalid `buildingId` returns `422`
- unknown building returns `404`
- inactive building returns `404`
- invalid page returns `422`
- invalid limit returns `422`
- invalid enum returns `422`
- invalid JSON returns `400`
- body that is not an object returns `422`
- suspended lister hides their listings
- deleted agent profile hides the lister's listings
- deleted listing is excluded
- private listing is excluded
