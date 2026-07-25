# Admin Search Platform Admins

List platform admin accounts.

This endpoint is admin-only. It lets an `OWNER` or `ADMIN` browse users who currently have platform access roles.

## Endpoint

```http
GET /api/v1/admin/users/platform-admins
```

Full local URL:

```http
GET http://localhost:3000/api/v1/admin/users/platform-admins?page=1&limit=20
```

## Headers

```http
Authorization: Bearer OWNER_OR_ADMIN_ACCESS_TOKEN
```

## Query Params

```txt
page   optional, number between 1 and 10000; default 1
limit  optional, number between 1 and 100; default 20
```

Examples:

```http
GET /api/v1/admin/users/platform-admins
GET /api/v1/admin/users/platform-admins?page=1&limit=20
GET /api/v1/admin/users/platform-admins?page=2&limit=1
```

## Auth Rules

Request is allowed only when:

- token is valid
- token user exists
- token user status is `ACTIVE`
- token user role is `OWNER` or `ADMIN`

Auth, active-account checks, and role authorization are handled by the shared admin route middleware.

## Role Filter

The endpoint returns only platform access users:

```js
{
  role: { $in: ["OWNER", "ADMIN"] }
}
```

Normal users are excluded:

```txt
role: USER
```

## Sorting And Pagination

Rows are sorted by role first, then newest first:

```js
{
  role: 1,
  createdAt: -1,
  _id: 1
}
```

Pagination uses:

```js
skip = (page - 1) * limit
```

The response always includes:

```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0
  }
}
```

Pages beyond the available rows return an empty `data` array with the requested page and total count.

## Projection

The endpoint returns a safe user projection only:

```json
{
  "_id": "user id",
  "name": "User Name",
  "email": "user@example.com",
  "authProvider": "PASSWORD",
  "role": "OWNER",
  "status": "ACTIVE",
  "createdAt": "2026-07-14T13:25:28.419Z",
  "updatedAt": "2026-07-19T13:10:57.175Z"
}
```

`password` must never appear in the response.

The safe projection is shared through admin-user aggregation helpers so list/detail/admin-role flows can reuse the same field contract.

## Success Output

Status:

```http
200 OK
```

Body:

```json
{
  "success": true,
  "data": [
    {
      "_id": "6a5638d9fc6d6328c9e1b283",
      "name": "Test Owner Two",
      "email": "test.owner.two@example.com",
      "authProvider": "PASSWORD",
      "role": "OWNER",
      "status": "ACTIVE",
      "createdAt": "2026-07-14T13:25:45.002Z",
      "updatedAt": "2026-07-14T13:25:45.002Z"
    },
    {
      "_id": "6a5638c8fc6d6328c9e1b282",
      "name": "Test Owner User",
      "email": "test.owner.user@example.com",
      "authProvider": "PASSWORD",
      "role": "OWNER",
      "status": "ACTIVE",
      "createdAt": "2026-07-14T13:25:28.419Z",
      "updatedAt": "2026-07-19T13:10:57.175Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2
  }
}
```

Page beyond range:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 3,
    "limit": 1,
    "total": 2
  }
}
```

## Error Cases

Invalid page:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "page must be between 1 and 10000"
}
```

Invalid limit:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "limit must be between 1 and 100"
}
```

Non-number limit:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "limit must be a number"
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

Suspended admin:

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

Inactive admin:

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

Deleted or missing token user:

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

Backend smoke covered:

- success through service
- success through HTTP route
- returns only `OWNER` and `ADMIN`
- excludes normal `USER`
- safe projection excludes `password`
- pagination
- invalid `page`
- invalid `limit`
- non-number `limit`
- missing token
- malformed bearer header
- invalid token
- non-admin user
- suspended admin token user
- inactive admin token user
- missing admin token user
- temporary user cleanup

Postman covered:

- `200` success
- pagination page 2
- page beyond range
- invalid page
- invalid limit
- non-number limit
- missing token
- malformed bearer header
- invalid token
- normal user forbidden
- suspended admin
- inactive admin
- missing admin user
- owner account restore with password preserved
