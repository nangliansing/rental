# Create Agent Profile

Create one agent profile for the currently authenticated active user.

## Endpoint

```http
POST /api/v1/agent-profiles
```

Full local URL:

```http
POST http://localhost:3000/api/v1/agent-profiles
```

## Headers

```http
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

## Input

```json
{
  "displayName": "Test Normal Agent",
  "description": "Agent profile for normal user testing.",
  "phone": "+66812345678",
  "supportLanguages": ["English", "Thai"]
}
```

At least one contact method is required:

- `phone`
- `lineUrl`
- `whatsappPhone`
- `telegramUrl`
- `viberPhone`

Optional profile photo shape:

```json
{
  "profilePhoto": {
    "publicId": "agent-profiles/sample",
    "secureUrl": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    "resourceType": "image",
    "format": "jpg",
    "width": 800,
    "height": 600,
    "bytes": 120000,
    "position": 0,
    "alt": "Photo Agent profile photo",
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

## Success Output

Status:

```http
201 Created
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
    "deletedAt": null,
    "deletedBy": null,
    "deleteReason": null,
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
    "updatedAt": "2026-07-14T16:55:20.273Z"
  }
}
```

## What We Checked

- Caller must send a valid access token.
- Refresh token cannot be used as an access token.
- Caller must exist in the database.
- Caller must have `status: "ACTIVE"`.
- Request body must be valid JSON.
- Request body must be an object.
- `displayName` is required.
- `supportLanguages` must contain at least one string.
- At least one contact method is required.
- Contact fields are validated.
- `lineUrl` must use HTTPS and one of: `line.me`, `www.line.me`, `lin.ee`.
- `telegramUrl` must use HTTPS and one of: `t.me`, `telegram.me`, `www.telegram.me`.
- `profilePhoto` must use the shared media shape with `publicId` and `secureUrl`.
- Server-controlled fields from the frontend are ignored.
- `userId` is always taken from the authenticated user.
- New profiles default to `isOnline: false`.
- New profiles default to `isDeleted: false`.
- New profiles default to `deletedAt: null`, `deletedBy: null`, and `deleteReason: null`.
- New profiles default to `isVerified: false`.
- New profiles default to `verifiedBy: null` and `verifiedAt: null`.
- Review summary defaults are initialized.
- One agent profile per user is enforced.
- Database queries use the passed session when a valid session is provided.
- Required unique index exists on `agent_profiles.userId`.
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

### Duplicate Agent Profile

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

### Missing Display Name

Request:

```json
{
  "description": "Missing display name test.",
  "phone": "+66822222222",
  "supportLanguages": ["English", "Thai"]
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
  "message": "displayName must be a string"
}
```

### Empty Display Name

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "displayName is required"
}
```

### Missing Support Languages

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "supportLanguages must contain at least one language"
}
```

### No Contact Method

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
