# Signup With Password

> **Status: dormant for V1.** This route is not registered and currently
> returns `404 NOT_FOUND`. Google authentication creates V1 accounts. The
> implementation is retained for a future password-auth release and must pass
> the reactivation checklist in
> [Dormant Authentication Endpoints](../unused-auth-endpoints.md) before use.

## Endpoint

```http
POST /api/v1/users/signup/password
```

Full local URL:

```http
POST http://localhost:3000/api/v1/users/signup/password
```

## Headers

```http
Content-Type: application/json
```

## Input

```json
{
  "name": "Test User One",
  "email": "test.user.one@example.com",
  "password": "Password123!"
}
```

Do not send `role`, `status`, or `authProvider` from the frontend. They are controlled by the backend.

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
    "_id": "USER_ID",
    "name": "Test User One",
    "email": "test.user.one@example.com",
    "authProvider": "PASSWORD",
    "role": "USER",
    "status": "ACTIVE",
    "createdAt": "2026-07-14T13:11:37.866Z",
    "updatedAt": "2026-07-14T13:11:37.866Z"
  }
}
```

`password` must not appear in the response.

## What We Checked

- Valid signup creates one user record.
- `name`, `email`, and `password` are validated.
- Email is trimmed and lowercased before storing.
- Duplicate email is blocked by the required unique `users.email` index.
- Frontend-sent `role`, `status`, and `authProvider` are ignored.
- Backend sets `role` to `USER`.
- Backend sets `status` to `ACTIVE`.
- Backend sets `authProvider` to `PASSWORD`.
- Password is stored as a bcrypt hash, not plain text.
- Failed validation requests do not create user records.
- Database writes use the passed session when a valid session is provided.

## Error Cases

### Duplicate Email

Request:

```json
{
  "name": "Test User One",
  "email": "test.user.one@example.com",
  "password": "Password123!"
}
```

Response:

```http
409 Conflict
```

```json
{
  "success": false,
  "code": "ACCOUNT_CREATE_FAILED",
  "message": "Unable to create account with these details"
}
```

### Missing Name

Request:

```json
{
  "email": "missing.name@example.com",
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
  "message": "name must be a string"
}
```

### Empty Name

Request:

```json
{
  "name": "",
  "email": "empty.name@example.com",
  "password": "Password123!"
}
```

Response:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "name is required"
}
```

### Invalid Email

Request:

```json
{
  "name": "Invalid Email Test",
  "email": "not-an-email",
  "password": "Password123!"
}
```

Response:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "email must be a valid email"
}
```

### Missing Email

Request:

```json
{
  "name": "Missing Email Test",
  "password": "Password123!"
}
```

Response:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "email must be a string"
}
```

### Missing Password

Request:

```json
{
  "name": "Missing Password Test",
  "email": "missing.password@example.com"
}
```

Response:

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
  "name": "Short Password Test",
  "email": "short.password@example.com",
  "password": "Pass1!"
}
```

Response:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "password must be at least 8 characters"
}
```

### Long Password

Request:

```json
{
  "name": "Long Password Test",
  "email": "long.password@example.com",
  "password": "Password123!Password123!Password123!Password123!Password123!Password123!Password123!"
}
```

Response:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "password must be at most 72 characters"
}
```

### Body Must Be Object

Request:

```json
[]
```

Response:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "body must be an object"
}
```

## Postman Checklist

1. Send the valid signup request.
2. Confirm `201 Created`.
3. Confirm response has no `password`.
4. Send the same email again.
5. Confirm duplicate email returns `409 Conflict`.
6. Send validation error requests one by one.
7. Confirm failed requests do not create database records.
