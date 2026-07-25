# Login With Password

> **Status: dormant for V1.** This route is not registered and currently
> returns `404 NOT_FOUND`. Google authentication is the only supported V1
> sign-in method. The implementation is retained for a future password-auth
> release and must pass the reactivation checklist in
> [Dormant Authentication Endpoints](../unused-auth-endpoints.md) before use.

## Endpoint

```http
POST /api/v1/users/login/password
```

Full local URL:

```http
POST http://localhost:3000/api/v1/users/login/password
```

## Headers

```http
Content-Type: application/json
```

## Input

```json
{
  "email": "test.normal.user@example.com",
  "password": "Password123!"
}
```

Only password-auth users can use this endpoint.

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
      "authProvider": "PASSWORD",
      "role": "USER",
      "status": "ACTIVE",
      "createdAt": "2026-07-14T13:25:14.477Z",
      "updatedAt": "2026-07-14T13:25:14.477Z"
    },
    "accessToken": "ACCESS_TOKEN"
  }
}
```

`password` must not appear in the response.

`refreshToken` must not appear in the JSON body. It is stored in an HTTP-only cookie.

## Refresh Token Cookie

After successful login, Postman should show a `refreshToken` cookie for `localhost`.

Example:

```txt
refreshToken=TOKEN; Path=/; HttpOnly; Expires=Fri, 17 Jul 2026 14:00:59 GMT;
```

Expected cookie behavior:

- Cookie name is `refreshToken`.
- Cookie is `HttpOnly`.
- Cookie max age is about 3 days.
- Cookie uses `SameSite=Strict` from the backend cookie options.
- Cookie uses `Secure` only in production.

## What We Checked

- Valid `USER` login works.
- Valid platform `OWNER` login works.
- Valid platform `ADMIN` login works.
- Email is trimmed and lowercased before lookup.
- Login requires `authProvider: "PASSWORD"`.
- Non-existing email returns a generic invalid-credentials error.
- Wrong password returns the same generic invalid-credentials error.
- Missing and invalid input is rejected.
- `INACTIVE` account cannot login.
- `SUSPENDED` account cannot login.
- Response includes an access token.
- Response does not include `password`.
- Response does not include `refreshToken` in the JSON body.
- Refresh token is stored as an HTTP-only cookie.
- Access token payload contains `sub`, `role`, `iat`, and `exp`.
- Refresh token payload contains `sub`, `tokenType: "refresh"`, `iat`, and `exp`.
- Tokens do not include sensitive fields like `password`, `email`, `name`, `status`, or `authProvider`.
- Database reads use the passed session when a valid session is provided.
- Login does not create or modify user records.
- The required unique `users.email` index is enough for this query because email is unique.

## Error Cases

### Non-Existing Email

Request:

```json
{
  "email": "does.not.exist@example.com",
  "password": "Password123!"
}
```

Response:

```http
401 Unauthorized
```

```json
{
  "success": false,
  "code": "INVALID_CREDENTIALS",
  "message": "Invalid email or password"
}
```

### Wrong Password

Request:

```json
{
  "email": "test.normal.user@example.com",
  "password": "WrongPassword123!"
}
```

Response:

```http
401 Unauthorized
```

```json
{
  "success": false,
  "code": "INVALID_CREDENTIALS",
  "message": "Invalid email or password"
}
```

### Missing Email

Request:

```json
{
  "password": "Password123!"
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
  "message": "email must be a string"
}
```

### Invalid Email

Request:

```json
{
  "email": "not-an-email",
  "password": "Password123!"
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
  "message": "email must be a valid email"
}
```

### Missing Password

Request:

```json
{
  "email": "test.normal.user@example.com"
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
  "message": "password is required"
}
```

### Short Password

Request:

```json
{
  "email": "test.normal.user@example.com",
  "password": "short"
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
  "message": "password must be at least 8 characters"
}
```

### Body Must Be Object

Request:

```json
[]
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

### Inactive Account

Request:

```json
{
  "email": "test.owner.two@example.com",
  "password": "Password123!"
}
```

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

Request:

```json
{
  "email": "test.owner.two@example.com",
  "password": "Password123!"
}
```

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

## Token Payload Checks

Access token payload:

```json
{
  "sub": "USER_ID",
  "role": "USER",
  "iat": 1784037659,
  "exp": 1784038559
}
```

Refresh token payload:

```json
{
  "sub": "USER_ID",
  "tokenType": "refresh",
  "iat": 1784037659,
  "exp": 1784296859
}
```

## Postman Checklist

1. Send a valid login request.
2. Confirm `200 OK`.
3. Confirm response has `data.user`.
4. Confirm response has `data.accessToken`.
5. Confirm response has no `password`.
6. Confirm response body has no `refreshToken`.
7. Open Postman cookie manager.
8. Confirm `refreshToken` cookie exists for `localhost`.
9. Confirm the cookie is `HttpOnly`.
10. Test validation errors one by one.
11. Test non-existing email and wrong password.
12. Test inactive and suspended account states.
13. Decode access token and refresh token payloads.
14. Confirm login did not create or unexpectedly update user records.
