# Admin Get User By Id

Get one user with optional lister profile context.

This endpoint is admin-only. It lets an `OWNER` or `ADMIN` inspect a user account safely without exposing password data.

## Endpoint

```http
GET /api/v1/admin/users/:userId
```

Full local URL:

```http
GET http://localhost:3000/api/v1/admin/users/6a5638bafc6d6328c9e1b281
```

## Headers

```http
Authorization: Bearer OWNER_OR_ADMIN_ACCESS_TOKEN
```

## Path Params

```txt
userId  required, valid user id
```

## Auth Rules

Request is allowed only when:

- token is valid
- token user exists
- token user status is `ACTIVE`
- token user role is `OWNER` or `ADMIN`

Auth, active-account checks, and role authorization are handled by the shared admin route middleware. The endpoint service only handles id validation, lookup, projection, and not-found behavior.

## Lookup Behavior

The endpoint returns the target user plus optional lister profile context.

The lister profile lookup matches:

```txt
users._id -> agent_profiles.userId
```

Missing profile records are preserved as `null`:

```json
{
  "agentProfile": null
}
```

This is intentional. Not every user has a lister profile, and admins should still be able to inspect the user account.

## Projection

The user response uses the shared safe admin user projection:

```json
{
  "_id": "user id",
  "name": "User Name",
  "email": "user@example.com",
  "authProvider": "PASSWORD",
  "role": "USER",
  "status": "ACTIVE",
  "createdAt": "2026-07-14T13:25:14.477Z",
  "updatedAt": "2026-07-17T21:06:05.880Z"
}
```

`password` must never appear in the response.

The lister profile projection is intentionally limited to admin-safe profile fields:

```json
{
  "_id": "agent profile id",
  "userId": "user id",
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
  "createdAt": "2026-07-14T16:55:20.273Z",
  "updatedAt": "2026-07-17T21:10:15.526Z"
}
```

## Query Flow

The service:

1. validates `userId`
2. matches user by `_id`
3. limits to one record
4. applies the shared safe user projection
5. looks up the optional agent profile by `userId`
6. preserves missing profile records as `null`
7. returns `USER_NOT_FOUND` when no target user exists

The shared detail pipeline is:

```js
[
  { $match: { _id: userId } },
  { $limit: 1 },
  buildAdminUserProject(),
  buildAdminUserAgentProfileLookup(),
  {
    $unwind: {
      path: "$agentProfile",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $addFields: {
      agentProfile: { $ifNull: ["$agentProfile", null] }
    }
  }
]
```

## Success Output

Status:

```http
200 OK
```

User with agent profile:

```json
{
  "success": true,
  "data": {
    "_id": "6a5638bafc6d6328c9e1b281",
    "name": "Test Normal User",
    "email": "test.normal.user@example.com",
    "authProvider": "PASSWORD",
    "role": "USER",
    "status": "ACTIVE",
    "createdAt": "2026-07-14T13:25:14.477Z",
    "updatedAt": "2026-07-17T21:06:05.880Z",
    "agentProfile": {
      "_id": "6a5669f81a9630e315e059a7",
      "userId": "6a5638bafc6d6328c9e1b281",
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
      "createdAt": "2026-07-14T16:55:20.273Z",
      "updatedAt": "2026-07-17T21:10:15.526Z"
    }
  }
}
```

User without agent profile:

```json
{
  "success": true,
  "data": {
    "_id": "6a567af318a65af44ed99cde",
    "name": "No Agent Profile User",
    "email": "no.agent.profile.user@example.com",
    "authProvider": "PASSWORD",
    "role": "USER",
    "status": "ACTIVE",
    "createdAt": "2026-07-14T18:07:47.047Z",
    "updatedAt": "2026-07-18T21:04:43.745Z",
    "agentProfile": null
  }
}
```

## Error Cases

Invalid user id:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "userId must be a valid id"
}
```

User not found:

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

Missing token:

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

Malformed bearer header:

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

Invalid token:

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

Non-admin user:

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

Suspended admin token user:

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

Inactive admin token user:

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

Missing admin token user:

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

## Tested Checklist

Backend smoke:

- service returns safe user with agent profile
- service returns `agentProfile: null` when no profile exists
- service rejects invalid `userId`
- service returns `USER_NOT_FOUND` for missing user
- HTTP success returns safe user with agent profile
- HTTP success returns `agentProfile: null` when no profile exists
- HTTP rejects invalid `userId`
- HTTP returns `USER_NOT_FOUND` for missing target user
- HTTP rejects missing access token
- HTTP rejects malformed bearer header
- HTTP rejects invalid access token
- HTTP rejects non-admin user
- HTTP rejects suspended admin token user
- HTTP rejects inactive admin token user
- HTTP rejects missing admin token user

Postman:

- owner login
- success: user with agent profile
- success: user without profile returns `agentProfile: null`
- invalid `userId`
- missing target user
- missing token
- malformed bearer header
- invalid token
- non-admin user forbidden
- suspended admin token user
- inactive admin token user
- missing admin token user
- owner fixture restored to `ACTIVE`
