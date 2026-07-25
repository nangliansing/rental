# Logout

## Endpoint

```http
POST /api/v1/users/logout
```

Full local URL:

```http
POST http://localhost:3000/api/v1/users/logout
```

## Headers

```http
Content-Type: application/json
```

## Input

No request body is required.

Postman can send an empty body or:

```json
{}
```

If a `refreshToken` cookie exists, it should be sent automatically by Postman.

## Success Output

Status:

```http
200 OK
```

Body:

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## What We Checked

- Logout clears the `refreshToken` HTTP-only cookie.
- Logout works even if no `refreshToken` cookie exists.
- Logout is idempotent.
- After logout, refresh token endpoint returns `REFRESH_TOKEN_REQUIRED`.
- Logout does not require an access token.
- Logout does not require a request body.
- Logout does not query or modify the database.
- Existing access tokens still work until they expire.
- Frontend clears the in-memory access token after logout.

## Cookie Behavior

Before logout, Postman may show:

```txt
refreshToken=JWT_REFRESH_TOKEN; Path=/; HttpOnly; Expires=...
```

After logout, the `refreshToken` cookie should be gone or expired.

## Important Access Token Behavior

This project uses stateless JWT access tokens.

Logout clears the refresh token, but it does not immediately revoke already-issued access tokens.

That means an old access token may still work until it expires:

```http
GET /api/v1/users/me
Authorization: Bearer OLD_ACCESS_TOKEN
```

Expected while the old access token is still valid:

```http
200 OK
```

This is acceptable for v1. If immediate access-token revocation is needed later, add server-side token/session storage or an access-token denylist.

## Error Cases

There are no normal client error cases for logout.

Unexpected server error:

```http
500 Internal Server Error
```

```json
{
  "success": false,
  "code": "INTERNAL_ERROR",
  "message": "Internal server error"
}
```

## Postman Checklist

1. Login to create a valid `refreshToken` cookie.
2. Call this endpoint.
3. Confirm `200 OK`.
4. Confirm response has `success: true`.
5. Confirm `refreshToken` cookie is gone or expired.
6. Call logout again without a cookie.
7. Confirm it still returns `200 OK`.
8. Call `POST /api/v1/users/token/refresh`.
9. Confirm refresh fails with `REFRESH_TOKEN_REQUIRED`.
10. Optionally call `/api/v1/users/me` with the old access token.
11. Confirm old access token still works until expiry.
