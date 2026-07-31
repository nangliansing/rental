# Update Current User

Update the authenticated active user's own account profile fields.

## Endpoint

```http
PATCH /api/v1/users/me
```

Full local URL:

```http
PATCH http://localhost:3000/api/v1/users/me
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
  "name": "Updated User Name",
  "profilePhoto": null
}
```

Allowed update fields:

- `name`
- `profilePhoto`

Optional profile photo shape:

```json
{
  "profilePhoto": {
    "publicId": "users/patch-sample",
    "secureUrl": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    "resourceType": "image",
    "format": "jpg",
    "width": 800,
    "height": 600,
    "bytes": 120000,
    "position": 0,
    "alt": "User profile photo",
    "isCover": false
  }
}
```

Do not send server-controlled fields. If sent, they are ignored:

- `email`
- `role`
- `status`
- `authProvider`
- `password`

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
    "user": {
      "_id": "6a5638bafc6d6328c9e1b281",
      "name": "Updated User Name",
      "email": "test.normal.user@example.com",
      "profilePhoto": null,
      "authProvider": "PASSWORD",
      "role": "USER",
      "status": "ACTIVE",
      "createdAt": "2026-07-14T13:25:14.477Z",
      "updatedAt": "2026-07-14T13:30:00.000Z"
    }
  }
}
```

`password` must not appear in the response.

## What We Checked

- Valid access token updates the current user only.
- Missing access token is rejected.
- Inactive user is rejected.
- Suspended user is rejected.
- Empty body is rejected.
- No-op updates are rejected.
- Unknown fields are ignored.
- Server-controlled fields cannot be changed through this endpoint.
- `profilePhoto` can be set or cleared with `null`.
- Response shape matches `GET /api/v1/users/me`.
- Sensitive-action rate limiting is applied per authenticated user.

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

### Inactive User

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

### Empty Body

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

### No Changes

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "No user changes provided"
}
```

### Rate Limit Exceeded

Response:

```http
429 Too Many Requests
```

```json
{
  "success": false,
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please try again later."
}
```

## Postman Checklist

1. Login to get a valid access token.
2. Call this endpoint with a changed `name`.
3. Confirm `200 OK` and updated `data.user`.
4. Call `GET /api/v1/users/me` and confirm the same values.
5. Set `profilePhoto`, then clear it with `null`.
6. Send an empty body and confirm validation error.
7. Send unchanged values and confirm no-op validation error.
8. Send ignored fields like `email` or `role` and confirm they do not change.
9. Test inactive and suspended users with old access tokens.
10. Confirm response has no `password`.
