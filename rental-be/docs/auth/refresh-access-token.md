# Refresh Access Token

## Endpoint

```http
POST /api/v1/users/token/refresh
```

Full local URL:

```http
POST http://localhost:3000/api/v1/users/token/refresh
```

## Headers

```http
Content-Type: application/json
```

## Input

No request body is required.

The `refreshToken` must already exist in the HTTP-only cookie. It is created after successful login.

Postman can send an empty body or:

```json
{}
```

Do not send the refresh token in the request body.

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
    "accessToken": "NEW_ACCESS_TOKEN"
  }
}
```

The response must not include `user`.

The response must not include `refreshToken`.

## What We Checked

- Valid refresh token cookie returns a new access token.
- Missing refresh token cookie is rejected.
- Invalid random refresh token is rejected.
- Access token used as refresh token is rejected.
- Refresh token must have `tokenType: "refresh"`.
- Refresh token for an inactive user is rejected.
- Refresh token for a suspended user is rejected.
- Refresh token for a deleted/non-existing user is rejected.
- Invalid refresh token clears the refresh cookie.
- Refresh token for non-active or missing user clears the refresh cookie.
- New access token is signed from the current DB user.
- Role changes after login are reflected in the refreshed access token.
- Response returns only `accessToken`.
- Database lookup uses the passed session when a valid session is provided.
- Query uses `_id`, so MongoDB's default `_id` index is enough.
- No extra speculative index is needed.

## Error Cases

### Missing Refresh Token Cookie

Request:

```http
POST /api/v1/users/token/refresh
```

Response:

```http
401 Unauthorized
```

```json
{
  "success": false,
  "code": "REFRESH_TOKEN_REQUIRED",
  "message": "Refresh token is required"
}
```

### Invalid Refresh Token

Cookie example:

```txt
refreshToken=not-a-valid-token
```

Response:

```http
401 Unauthorized
```

```json
{
  "success": false,
  "code": "INVALID_REFRESH_TOKEN",
  "message": "Invalid or expired refresh token"
}
```

The invalid cookie should be cleared after this response.

### Access Token Used As Refresh Token

Cookie example:

```txt
refreshToken=ACCESS_TOKEN
```

Response:

```http
401 Unauthorized
```

```json
{
  "success": false,
  "code": "INVALID_REFRESH_TOKEN",
  "message": "Invalid or expired refresh token"
}
```

The cookie should be cleared after this response.

### Inactive User

Scenario:

1. Login as an active user.
2. Keep the valid `refreshToken` cookie.
3. Change that user's status to `INACTIVE`.
4. Call this endpoint.

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
2. Keep the valid `refreshToken` cookie.
3. Change that user's status to `SUSPENDED`.
4. Call this endpoint.

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

Scenario:

1. Create a temporary user.
2. Login as that user.
3. Keep the valid `refreshToken` cookie.
4. Delete the temporary user from the database.
5. Call this endpoint.

Response:

```http
401 Unauthorized
```

```json
{
  "success": false,
  "code": "INVALID_REFRESH_TOKEN",
  "message": "Invalid refresh token"
}
```

The cookie should be cleared after this response.

## Token Payload Checks

Refresh token payload:

```json
{
  "sub": "USER_ID",
  "tokenType": "refresh",
  "iat": 1784039870,
  "exp": 1784299070
}
```

New access token payload:

```json
{
  "sub": "USER_ID",
  "role": "USER",
  "iat": 1784039574,
  "exp": 1784040474
}
```

The new access token role should come from the current DB user record.

## Postman Checklist

1. Login to create a valid `refreshToken` cookie.
2. Call this endpoint with no request body or `{}`.
3. Confirm `200 OK`.
4. Confirm response has `data.accessToken`.
5. Confirm response does not include `user`.
6. Confirm response does not include `refreshToken`.
7. Delete the cookie and confirm missing-token error.
8. Set an invalid cookie and confirm invalid-token error.
9. Confirm invalid cookie is cleared.
10. Put an access token in the refresh cookie and confirm it is rejected.
11. Confirm access-token cookie misuse clears the cookie.
12. Test inactive user.
13. Test suspended user.
14. Test deleted user.
15. Test role changed after login.
16. Decode the new access token and confirm the latest DB role is used.
17. Confirm no extra database indexes are needed.
