# Update My Agent Profile

Update the current authenticated active user's non-deleted agent profile.

## Endpoint

```http
PATCH /api/v1/agent-profiles/me
```

Full local URL:

```http
PATCH http://localhost:3000/api/v1/agent-profiles/me
```

## Headers

```http
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

## Input

All fields are optional, but at least one valid changed field is required.

```json
{
  "displayName": "Patch Restored Agent",
  "description": null,
  "phone": "+66899999999",
  "lineUrl": null,
  "whatsappPhone": null,
  "telegramUrl": null,
  "viberPhone": null,
  "supportLanguages": ["English", "Thai"],
  "profilePhoto": null
}
```

Allowed update fields:

- `displayName`
- `description`
- `phone`
- `lineUrl`
- `whatsappPhone`
- `telegramUrl`
- `viberPhone`
- `supportLanguages`
- `profilePhoto`

At least one contact method must remain after the update:

- `phone`
- `lineUrl`
- `whatsappPhone`
- `telegramUrl`
- `viberPhone`

Optional fields can be cleared with `null` or an empty string where the validator allows optional strings.

Optional profile photo shape:

```json
{
  "profilePhoto": {
    "publicId": "agent-profiles/patch-sample",
    "secureUrl": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    "resourceType": "image",
    "format": "jpg",
    "width": 800,
    "height": 600,
    "bytes": 120000,
    "position": 0,
    "alt": "Patch Agent profile photo",
    "isCover": false
  }
}
```

Do not send server-controlled fields. If sent, they are ignored:

- `userId`
- `isOnline`
- `isDeleted`
- `isVerified`
- `verifiedBy`
- `verifiedAt`
- `reviewSummary`

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
    "updatedAt": "2026-07-14T19:24:35.313Z"
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
- Active user with no profile receives `AGENT_PROFILE_NOT_FOUND`.
- Soft-deleted profile receives `AGENT_PROFILE_NOT_FOUND`.
- Restoring `isDeleted: false` makes the same profile updateable again.
- Empty body is rejected.
- `null` body is rejected.
- Malformed JSON is rejected.
- True no-op update is rejected.
- Protected fields from the frontend are ignored.
- `displayName` is validated.
- `description` is validated and can be cleared.
- `supportLanguages` is validated, trimmed, and deduplicated.
- Contact fields are validated.
- At least one contact method must remain after update.
- `lineUrl` must use HTTPS and one of: `line.me`, `www.line.me`, `lin.ee`.
- `telegramUrl` must use HTTPS and one of: `t.me`, `telegram.me`, `www.telegram.me`.
- `profilePhoto` must use the shared media shape with `publicId` and `secureUrl`.
- `profilePhoto` can be set or cleared.
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

This happens when the active user has no agent profile or when the profile is soft-deleted.

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

### Body Is Not An Object

Request:

```json
null
```

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "body must be an object"
}
```

### Empty Body

Request:

```json
{}
```

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "No valid fields provided for update"
}
```

### No Profile Changes

Request:

```json
{
  "displayName": "Patch Restored Agent"
}
```

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "No profile changes provided"
}
```

### No Contact Method Remains

Request:

```json
{
  "phone": ""
}
```

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "At least one contact method is required"
}
```

### Invalid Display Name

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "displayName must be a string"
}
```

### Invalid Support Languages

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "supportLanguages must be an array"
}
```

### Invalid Line URL

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "lineUrl must use one of: line.me, www.line.me, lin.ee"
}
```

### Invalid Telegram URL

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "telegramUrl must use one of: t.me, telegram.me, www.telegram.me"
}
```

### Invalid Profile Photo

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "profilePhoto.secureUrl must be a string"
}
```

### Malformed JSON

Response:

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
