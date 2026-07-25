# Admin Update Agent Profile Verification

> **Status: dormant and disabled.** Verification is planned to use a dedicated request and
> evidence collection. See
> [Unused Admin Endpoint Registry](../unused-admin-endpoints.md) before
> restoring this direct verification mutation.

Verify or unverify an agent profile as a platform `OWNER` or `ADMIN`.

## Endpoint

```http
PATCH /api/v1/admin/agent-profiles/:agentProfileId
```

Full local URL:

```http
PATCH http://localhost:3000/api/v1/admin/agent-profiles/:agentProfileId
```

## Headers

```http
Authorization: Bearer OWNER_OR_ADMIN_ACCESS_TOKEN
Content-Type: application/json
```

## Input

Verify:

```json
{
  "isVerified": true,
  "reason": "Verified identity and contact details."
}
```

Unverify:

```json
{
  "isVerified": false,
  "reason": "Verification removed after review."
}
```

Only `isVerified` is accepted as a moderation change. `reason` is always required.

Do not send server-controlled fields. If sent, they are ignored:

- `userId`
- `isOnline`
- `isDeleted`
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
    "isVerified": true,
    "verifiedBy": "6a5638e9fc6d6328c9e1b285",
    "verifiedAt": "2026-07-15T01:23:39.754Z",
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
    "updatedAt": "2026-07-15T01:23:39.883Z"
  }
}
```

When unverifying, the response has:

```json
{
  "isVerified": false,
  "verifiedBy": null,
  "verifiedAt": null
}
```

## Notification

This endpoint creates a notification for the profile owner inside the same transaction.

The socket notification is emitted only after the transaction commits.

Verify notification:

```json
{
  "type": "AGENT_PROFILE_VERIFIED",
  "entityType": "AGENT_PROFILE",
  "entityId": "6a5669f81a9630e315e059a7",
  "metadata": {
    "agentProfileId": "6a5669f81a9630e315e059a7",
    "isVerified": true,
    "reason": "Verified identity and contact details."
  }
}
```

Unverify notification:

```json
{
  "type": "AGENT_PROFILE_UNVERIFIED",
  "entityType": "AGENT_PROFILE",
  "entityId": "6a5669f81a9630e315e059a7",
  "metadata": {
    "agentProfileId": "6a5669f81a9630e315e059a7",
    "isVerified": false,
    "reason": "Verification removed after review."
  }
}
```

## What We Checked

- Caller must send a valid access token.
- Refresh token cannot be used as an access token.
- Caller must exist in the database.
- Caller must have `status: "ACTIVE"`.
- Caller must have current DB role `OWNER` or `ADMIN`.
- Normal `USER` receives `FORBIDDEN`.
- If an admin role is changed after login, the fresh DB role is respected.
- `agentProfileId` must be a valid id.
- Non-existing agent profile returns `AGENT_PROFILE_NOT_FOUND`.
- Soft-deleted agent profile returns `AGENT_PROFILE_NOT_FOUND`.
- Profile owner user must still exist.
- Profile owner can be `ACTIVE`, `INACTIVE`, or `SUSPENDED`.
- User account status is not changed by this endpoint.
- `AgentProfile.isOnline` is not changed by this endpoint.
- Only `AgentProfile.isVerified`, `verifiedBy`, and `verifiedAt` are changed.
- `reason` is required.
- `isVerified` must be a boolean.
- No-op moderation is rejected.
- Protected frontend fields are ignored.
- Notification is created for verify and unverify.
- Database actions use a transaction.
- Socket notification emits after commit.
- Query uses `_id`, so MongoDB's default `_id` index is enough.
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

### Forbidden Role

Response:

```http
403 Forbidden
```

```json
{
  "success": false,
  "code": "FORBIDDEN",
  "message": "Forbidden"
}
```

### Invalid Agent Profile Id

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "agentProfileId must be a valid id"
}
```

### Agent Profile Not Found

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

### Profile User Not Found

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

### Missing Reason

Request:

```json
{
  "isVerified": true
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
  "message": "reason is required"
}
```

### Invalid Reason

Request:

```json
{
  "isVerified": true,
  "reason": 123
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
  "message": "reason must be a string"
}
```

### Invalid Is Verified

Request:

```json
{
  "isVerified": "true",
  "reason": "Invalid isVerified type test."
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
  "message": "isVerified must be a boolean"
}
```

### Missing Is Verified

Request:

```json
{
  "reason": "Missing isVerified test."
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
  "message": "No valid fields provided for update"
}
```

### No Moderation Changes

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "No moderation changes provided"
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
