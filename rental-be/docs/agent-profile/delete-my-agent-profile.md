# Delete My Agent Profile

Soft delete the current authenticated active user's non-deleted agent profile.

## Endpoint

```http
DELETE /api/v1/agent-profiles/me
```

Full local URL:

```http
DELETE http://localhost:3000/api/v1/agent-profiles/me
```

## Headers

```http
Authorization: Bearer ACCESS_TOKEN
```

## Input

No request body is required.

The backend does not trust any frontend `userId`, profile id, or delete metadata. The profile owner is always taken from the authenticated user.

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
    "_id": "6a5787d19681ddfa97778e8c",
    "userId": "6a57875b9681ddfa97778e8b",
    "isOnline": false,
    "isDeleted": true,
    "deletedAt": "2026-07-15T13:16:20.795Z",
    "deletedBy": "6a57875b9681ddfa97778e8b",
    "deleteReason": null,
    "displayName": "Delete Metadata Agent",
    "profilePhoto": null,
    "description": "Agent profile for delete metadata retest.",
    "phone": "+66890909090",
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
    "createdAt": "2026-07-15T13:14:57.666Z",
    "updatedAt": "2026-07-15T13:16:20.796Z"
  }
}
```

## What It Updates

The endpoint soft deletes the existing profile. It does not hard delete the MongoDB document.

Updated fields:

- `isOnline: false`
- `isDeleted: true`
- `deletedAt: current server date`
- `deletedBy: authenticated user id`
- `deleteReason: null`
- `isVerified: false`
- `verifiedBy: null`
- `verifiedAt: null`

Preserved fields:

- `_id`
- `userId`
- profile content fields
- `reviewSummary`
- `createdAt`

## What We Checked

- Caller must send a valid access token.
- Refresh token cannot be used as an access token.
- Caller must exist in the database.
- Caller must have `status: "ACTIVE"`.
- Backend uses `req.currentUser._id`.
- Backend does not trust `userId`, profile id, or delete metadata from the frontend.
- Only the authenticated user's non-deleted profile can be deleted.
- A missing profile returns `AGENT_PROFILE_NOT_FOUND`.
- An already-deleted profile returns `AGENT_PROFILE_NOT_FOUND`.
- `GET /api/v1/agent-profiles/me` returns `AGENT_PROFILE_NOT_FOUND` after delete.
- `POST /api/v1/agent-profiles` still returns `AGENT_PROFILE_ALREADY_EXISTS` after delete.
- One lifetime agent profile per user remains enforced.
- Database query uses the passed session when a valid session is provided.
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

### Deleted Or Missing User

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

This is returned when the user never had an agent profile or the profile is already soft deleted.

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

### Create Again After Delete

Soft delete does not allow creating a second profile for the same user.

Response:

```http
409 Conflict
```

```json
{
  "success": false,
  "code": "AGENT_PROFILE_ALREADY_EXISTS",
  "message": "Agent profile already exists for this user"
}
```
