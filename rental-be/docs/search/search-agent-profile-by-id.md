# Search Agent Profile By Id

Fetch one public agent profile for the lister profile page.

Authentication is optional at the route level, but this endpoint does not use viewer-specific data.

## Endpoint

```http
GET /api/v1/search/agents/:agentProfileId
```

Full local URL:

```http
GET http://localhost:3000/api/v1/search/agents/:agentProfileId
```

Example:

```http
GET http://localhost:3000/api/v1/search/agents/6a5669f81a9630e315e059a7
```

## Headers

Optional:

```http
Authorization: Bearer ACCESS_TOKEN
```

## Public Visibility Rules

The profile returns only when:

- `agentProfileId` exists
- agent profile is not deleted
- linked owner user exists
- linked owner user status is `ACTIVE`

Hidden from response:

- `agentProfile.userId`

Display-only fields:

- `AgentProfile.isOnline` does not hide the profile.
- `AgentProfile.isVerified` does not hide the profile.

## Listing Summary Rules

`listingSummary.activeCount` counts only public available listings:

- listing belongs to the agent profile owner
- listing visibility is `PUBLIC`
- listing is not deleted
- listing building exists
- listing building `isActive` is `true`

Pending post summary counts:

- `pendingCount` counts pending posts with status `PENDING`
- `approvedCount` counts pending posts with status `APPROVED`
- `rejectedCount` counts pending posts with status `REJECTED`
- deleted pending posts are excluded

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
      },
      "createdAt": "2026-07-14T16:55:20.273Z",
      "isOnline": true,
      "listingSummary": {
        "activeCount": 17,
        "pendingCount": 1,
        "approvedCount": 5,
        "rejectedCount": 9
      }
    }
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

- `200` success
- `agentProfile.userId` is hidden
- invalid `agentProfileId`
- unknown `agentProfileId`
- deleted agent profile returns `AGENT_PROFILE_NOT_FOUND`
- suspended owner user returns `AGENT_PROFILE_NOT_FOUND`
- inactive owner user returns `AGENT_PROFILE_NOT_FOUND`
- `isOnline: false` still returns `200`
- `isVerified: true` still returns `200`
- private listing is excluded from `listingSummary.activeCount`
- deleted listing is excluded from `listingSummary.activeCount`
- inactive building listings are excluded from `listingSummary.activeCount`
- final restored baseline returns expected `activeCount`
