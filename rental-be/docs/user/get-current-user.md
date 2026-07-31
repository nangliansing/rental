# Get Current User

## Endpoint

```http
GET /api/v1/users/me
```

Full local URL:

```http
GET http://localhost:3000/api/v1/users/me
```

## Headers

```http
Authorization: Bearer ACCESS_TOKEN
```

No request body is required.

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
      "name": "Test Normal User",
      "email": "test.normal.user@example.com",
      "profilePhoto": null,
      "authProvider": "PASSWORD",
      "role": "USER",
      "status": "ACTIVE",
      "createdAt": "2026-07-14T13:25:14.477Z",
      "updatedAt": "2026-07-14T13:25:14.477Z"
    }
  }
}
```

`password` must not appear in the response.

## What We Checked

- Valid access token returns the current user.
- Missing access token is rejected.
- Malformed authorization scheme is rejected.
- Invalid Bearer token is rejected.
- Refresh token used as access token is rejected.
- Deleted/non-existing user is rejected.
- Inactive user is rejected.
- Suspended user is rejected.
- Response does not include `password`.
- Backend checks the current DB user, not only the token payload.
- Access token must include `sub` and `role`.
- Database lookup uses the passed session when a valid session is provided.
- Query uses `_id`, so MongoDB's default `_id` index is enough.
- No extra speculative index is needed.

## Error Cases

### Missing Access Token

Request:

```http
GET /api/v1/users/me
```

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

### Malformed Authorization Header

Header:

```http
Authorization: Token abc123
```

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

Header:

```http
Authorization: Bearer not-a-valid-token
```

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

### Refresh Token Used As Access Token

Header:

```http
Authorization: Bearer REFRESH_TOKEN
```

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

### User Not Found

Scenario:

1. Create a temporary user.
2. Login as that user.
3. Keep the access token.
4. Delete the temporary user from the database.
5. Call this endpoint with the old access token.

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

### Inactive User

Scenario:

1. Login as an active user.
2. Keep the access token.
3. Change that user's status to `INACTIVE`.
4. Call this endpoint with the old access token.

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

### Suspended User

Scenario:

1. Login as an active user.
2. Keep the access token.
3. Change that user's status to `SUSPENDED`.
4. Call this endpoint with the old access token.

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

## Postman Checklist

1. Login to get a valid access token.
2. Call this endpoint with `Authorization: Bearer ACCESS_TOKEN`.
3. Confirm `200 OK`.
4. Confirm response has `data.user`.
5. Confirm the user matches the token subject.
6. Confirm response has no `password`.
7. Remove authorization header and confirm missing-token error.
8. Use malformed authorization scheme and confirm missing-token error.
9. Use invalid Bearer token and confirm invalid-token error.
10. Use refresh token as Bearer token and confirm invalid-token error.
11. Test deleted user with old access token.
12. Test inactive user with old access token.
13. Test suspended user with old access token.
14. Confirm no extra database indexes are needed.
