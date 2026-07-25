# Get My Agent Profile

Return the current authenticated active user's agent profile.

## Endpoint

```http
GET /api/v1/agent-profiles/me
```

Full local URL:

```http
GET http://localhost:3000/api/v1/agent-profiles/me
```

## Headers

```http
Authorization: Bearer ACCESS_TOKEN
```

## Input

No request body is required.

Do not send `userId` in the body, query, or params. The backend always uses the authenticated user from the access token.

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
    "_id": "6a5669f81a9630e315e059a7",
    "userId": "6a5638bafc6d6328c9e1b281",
    "isOnline": false,
    "isDeleted": false,
    "displayName": "Test Normal Agent",
    "profilePhoto": null,
    "description": "Agent profile for normal user testing.",
    "phone": "+66812345678",
    "lineUrl": null,
    "whatsappPhone": null,
    "telegramUrl": null,
    "viberPhone": null,
    "supportLanguages": ["English", "Thai"],
    "isVerified": false,
    "verifiedBy": null,
    "verifiedAt": null,
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
    "updatedAt": "2026-07-14T16:55:20.273Z",
    "listingSummary": {
      "activeCount": 0,
      "pendingCount": 0,
      "rejectedCount": 0
    }
  }
}
```

## What We Checked

- Caller must send a valid access token.
- Refresh token cannot be used as an access token.
- Caller must exist in the database.
- Caller must have `status: "ACTIVE"`.
- Backend uses `req.currentUser._id`.
- Backend does not trust `userId` from body, query, or params.
- Active user with an agent profile receives the profile.
- Active user with no agent profile receives `AGENT_PROFILE_NOT_FOUND`.
- Soft-deleted agent profile receives `AGENT_PROFILE_NOT_FOUND`.
- Restoring `isDeleted: false` makes the same profile available again.
- Response includes `listingSummary`.
- Database queries use the passed session when a valid session is provided.
- Query uses `agent_profiles.userId`.
- Existing unique `agent_profiles.userId` index is enough.
- No extra speculative index is needed.

## Error Cases

### Missing Access Token

Response:

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

### Invalid Access Token

Response:

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

### Inactive Account

Response:

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

### Suspended Account

Response:

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

### Deleted User

Response:

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

### Agent Profile Not Found

This happens when the active user has no agent profile.

Response:

```http
404 Not Found
```

```json
{
  "success": false,
  "code": "AGENT_PROFILE_NOT_FOUND",
  "message": "Agent profile not found"
}
```

### Soft-Deleted Agent Profile

Under Option A, users have one lifetime agent profile. A soft-deleted profile still exists in the database, but this endpoint treats it as unavailable.

Response:

```http
404 Not Found
```

```json
{
  "success": false,
  "code": "AGENT_PROFILE_NOT_FOUND",
  "message": "Agent profile not found"
}
```
