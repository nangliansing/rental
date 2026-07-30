# Search Listings By Agent

Fetch public listings listed by one public agent profile.

Authentication is optional and is only used to calculate listing `isSavedByMe`.

Each returned listing includes `availableAt`. See [`../listing/available-at-response.md`](../listing/available-at-response.md).

## Endpoint

```http
GET /api/v1/search/agents/:agentProfileId/listings
```

Full local URL:

```http
GET http://localhost:3000/api/v1/search/agents/:agentProfileId/listings
```

Example:

```http
GET http://localhost:3000/api/v1/search/agents/6a5669f81a9630e315e059a7/listings?page=1&limit=20&filter=now&sort=latest
```

## Headers

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

## Query Params

```txt
page    optional, default 1, range 1 to 10000
limit   optional, default 20, range 1 to 100
filter  optional, default all
sort    optional, default latest
```

Allowed `filter` values:

```txt
all
now
soon
```

Availability boundaries use the Thailand calendar (`Asia/Bangkok`, UTC+7). See [`../listing/available-at-response.md`](../listing/available-at-response.md).

| Filter | Meaning |
| --- | --- |
| `all` | All public listings for the agent (includes flexible listings with `availableAt: null`) |
| `now` | Public listings with a set `availableAt` on or before today (Bangkok calendar) |
| `soon` | Public listings with `availableAt` on or after tomorrow (Bangkok calendar) |

Flexible public listings (`availableAt: null`) appear only under `all`, not `now` or `soon`.

Allowed `sort` values:

```txt
latest
oldest
```

| Filter | Primary sort | Tie-breakers |
| --- | --- | --- |
| `all`, `now` | `createdAt` (`latest` → descending, `oldest` → ascending) | `_id` |
| `soon` | `availableAt` ascending (soonest availability first) | `createdAt`, then `_id` |

For `filter=soon`, the requested `sort` value applies only as a tie-breaker when multiple listings share the same availability date.

## Public Visibility Rules

The agent page returns only when:

- `agentProfileId` exists
- agent profile is not deleted
- linked agent owner user exists
- linked agent owner user status is `ACTIVE`

Listings are returned only when:

- listing belongs to the agent profile owner
- listing visibility is `PUBLIC`
- listing is not deleted
- listing building exists
- listing building `isActive` is `true`

Display-only fields:

- `AgentProfile.isOnline` does not hide public listings.
- `AgentProfile.isVerified` does not hide public listings.

Privacy rule:

- top-level `agentProfile.userId` is not returned.

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
    "agentProfile": {
      "_id": "6a5669f81a9630e315e059a7",
      "displayName": "Patch Restored Agent",
      "profilePhoto": null,
      "description": null,
      "phone": "+66899999999",
      "lineUrl": null,
      "whatsappPhone": null,
      "telegramUrl": null,
      "viberPhone": null,
      "supportLanguages": ["English", "Thai"],
      "isVerified": false,
      "createdAt": "2026-07-14T16:55:20.273Z",
      "isOnline": true
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
        "createdAt": "2026-07-15T18:26:44.251Z",
        "updatedAt": "2026-07-17T14:37:10.899Z",
        "building": {
          "_id": "6a57c6da947d934e03495b7a",
          "name": "Bangkapi Protected Field Residence",
          "address": "Lat Phrao Road, Khlong Chan, Bang Kapi, Bangkok 10240, Thailand",
          "buildingType": "Apartment",
          "facilities": ["Parking", "Lift"],
          "isActive": true,
          "location": {
            "type": "Point",
            "coordinates": [100.6435, 13.7654]
          },
          "security": ["CCTV", "Keycard Access"]
        },
        "isSavedByMe": false
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 17
  }
}
```

## Empty Result

If the public agent profile exists but no listings are currently visible:

```json
{
  "success": true,
  "data": {
    "agentProfile": {
      "_id": "6a5669f81a9630e315e059a7",
      "displayName": "Patch Restored Agent",
      "profilePhoto": null,
      "description": null,
      "phone": "+66899999999",
      "lineUrl": null,
      "whatsappPhone": null,
      "telegramUrl": null,
      "viberPhone": null,
      "supportLanguages": ["English", "Thai"],
      "isVerified": false,
      "createdAt": "2026-07-14T16:55:20.273Z",
      "isOnline": true
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

## Validation Errors

Invalid `agentProfileId`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "agentProfileId must be a valid id"
}
```

Invalid `page`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "page must be between 1 and 10000"
}
```

Invalid `limit`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "limit must be between 1 and 100"
}
```

Invalid `filter`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid filter: private"
}
```

Invalid `sort`:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid sort: random"
}
```

## Not Found

Agent profile not found, deleted, or linked owner user is missing/suspended/inactive:

```json
{
  "success": false,
  "code": "AGENT_PROFILE_NOT_FOUND",
  "message": "Agent profile not found"
}
```

## Tested Checklist

- `200` anonymous success
- `200` page 1 and page 2 pagination
- `200` page beyond total returns empty `listings`
- `filter=all`, `now`, and `soon`
- flexible public listings excluded from `now` and `soon`
- `sort=latest` and `sort=oldest` for non-soon filters (by `createdAt`)
- `filter=soon` sorts by `availableAt` ascending with `createdAt` tie-breakers
- active authenticated viewer calculates `isSavedByMe`
- invalid token falls back to anonymous
- suspended viewer token falls back to anonymous
- inactive viewer token falls back to anonymous
- missing viewer token falls back to anonymous
- invalid `filter`, `sort`, `page`, and `limit` values
- unknown `agentProfileId`
- deleted agent profile returns `AGENT_PROFILE_NOT_FOUND`
- suspended agent owner returns `AGENT_PROFILE_NOT_FOUND`
- inactive agent owner returns `AGENT_PROFILE_NOT_FOUND`
- private listing is hidden
- deleted listing is hidden
- inactive building hides its listings
