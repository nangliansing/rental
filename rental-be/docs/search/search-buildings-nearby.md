# Search Buildings Nearby

Search active buildings near a map position.

Authentication is optional and is only used to calculate listing `isSavedByMe`.

## Endpoint

```http
POST /api/v1/search/buildings/nearby
```

Full local URL:

```http
POST http://localhost:3000/api/v1/search/buildings/nearby
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
  "position": {
    "lng": 100.6435,
    "lat": 13.7654
  },
  "radiusMeters": 300,
  "limit": 20
}
```

`position` uses `lat` and `lng`.

MongoDB `location.coordinates` in the response uses GeoJSON order: `[lng, lat]`.

Defaults:

- `radiusMeters`: `300`
- `limit`: `20`

Limits:

- `radiusMeters`: `1` to `1000`
- `limit`: `1` to `100`

## Optional Filters

```json
{
  "minRent": 14000,
  "maxRent": 20000,
  "buildingType": "Condo",
  "buildingFacilities": ["Parking", "Gym"],
  "security": ["Security Guard"],
  "listingFacilities": ["Air Conditioner", "Washing Machine"],
  "kitchenType": "Kitchen",
  "contractMonths": 3,
  "occupancy": 4,
  "bedroomCount": 2,
  "bathroomCount": 2,
  "isForeignerAccepted": true,
  "isTM30Provided": true,
  "isCookingAllowed": true,
  "isPetAllowed": true,
  "supportLanguages": ["English"],
  "agentProfileIds": ["6a5669f81a9630e315e059a7"],
  "includeBuildingsWithoutMatchingListings": false
}
```

Filter behavior:

- `buildingFacilities`, `security`, and `listingFacilities` use `all` matching.
- `kitchenType: "Kitchen"` matches both `"Kitchen"` and `"Separate Kitchen"`.
- `contractMonths` means listing contract months must be less than or equal to the requested value.
- `occupancy` means listing occupancy must be greater than or equal to the requested value.
- `bedroomCount: 0` means exactly studio/no bedroom.
- `bedroomCount > 0` means greater than or equal to the requested value.
- `supportLanguages` uses OR matching.
- `includeBuildingsWithoutMatchingListings: true` can return active buildings with `listings: []`.

## Success Output

Status:

```http
200 OK
```

Body:

```json
{
  "success": true,
  "data": [
    {
      "_id": "6a595fd9e0608be2e4255f64",
      "name": "Search Filter Fixture - Pet Condo",
      "address": "Lat Phrao Road, Bang Kapi, Bangkok",
      "buildingType": "Condo",
      "facilities": ["Parking", "Gym", "Swimming Pool"],
      "security": ["Security Guard", "Keycard Access"],
      "location": {
        "type": "Point",
        "coordinates": [100.642, 13.7656]
      },
      "minRent": 14500,
      "maxRent": 22000,
      "listings": [
        {
          "_id": "6a596137e24814847ca9713c",
          "visibility": "PUBLIC",
          "isForeignerAccepted": true,
          "isTM30Provided": true,
          "rent": 18000,
          "deposit": 36000,
          "moveInCost": 54000,
          "electricRate": 8,
          "waterRate": 20,
          "bedroomCount": 2,
          "bathroomCount": 2,
          "kitchenType": "Separate Kitchen",
          "size": 48,
          "contractMonths": 12,
          "occupancy": 3,
          "isCookingAllowed": true,
          "isPetAllowed": true,
          "facilities": ["Air Conditioner", "Washing Machine", "Balcony"],
          "media": [
            {
              "publicId": "search-filter-fixtures/pet-condo",
              "secureUrl": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
              "resourceType": "image",
              "format": "jpg",
              "width": 800,
              "height": 600,
              "bytes": 120000,
              "position": 0,
              "alt": "Pet friendly condo room",
              "isCover": true
            }
          ],
          "description": "Pet friendly condo fixture.",
          "isDeleted": false,
          "deletedAt": null,
          "deletedBy": null,
          "deleteReason": null,
          "listedBy": "6a5638bafc6d6328c9e1b281",
          "buildingId": "6a595fd9e0608be2e4255f64",
          "isSavedByMe": false,
          "createdAt": "2026-07-16T22:54:47.799Z",
          "updatedAt": "2026-07-16T22:54:47.799Z"
        }
      ],
      "distanceMeters": 164
    }
  ]
}
```

Results are sorted by nearest distance first.

`distanceMeters` is rounded to the nearest meter.

## Availability Rules

By default, a building is returned only when all of these are true:

- building is within `radiusMeters` of `position`
- building `isActive` is `true`
- building matches building filters
- building has at least one matching listing
- matching listing `visibility` is `PUBLIC`
- matching listing `isDeleted` is `false`
- lister has a non-deleted agent profile
- lister user exists
- lister user `status` is `ACTIVE`

When `includeBuildingsWithoutMatchingListings` is `true`:

- active buildings within `radiusMeters` can be returned with `listings: []`
- inactive buildings are still excluded
- building filters still apply

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

Invalid latitude:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "position.lat must be between -90 and 90"
}
```

Invalid radius:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "radiusMeters must be between 1 and 1000"
}
```

Invalid radius type:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "radiusMeters must be an integer"
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
  "message": "Invalid buildingType: APARTMENT"
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

## Tested Scenarios

- base anonymous nearby search returns `200`
- results are sorted by nearest distance first
- `limit` works
- small radius works
- far-away search returns `200` with `data: []`
- building type filter works
- rent range filter works
- combined filters work
- no matching listings returns no buildings by default
- `includeBuildingsWithoutMatchingListings: true` returns active buildings with `listings: []`
- inactive buildings are excluded even with `includeBuildingsWithoutMatchingListings: true`
- invalid body returns `422`
- invalid JSON returns `400`
- invalid latitude returns `422`
- invalid radius range returns `422`
- non-integer radius returns `422`
- invalid limit returns `422`
- invalid access token returns `200` as anonymous
- refresh token sent as bearer token returns `200` as anonymous
- active authenticated viewer can get `isSavedByMe: true`
- suspended viewer returns `200` as anonymous
- inactive viewer returns `200` as anonymous
- missing viewer user returns `200` as anonymous
- suspended lister hides their listings
- deleted agent profile hides the lister's listings
