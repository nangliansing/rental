# Admin Search Suspensions

List account suspensions for admin review.

This endpoint is admin-only. It lets an `OWNER` or `ADMIN` browse suspension history, filter by suspension status, and inspect lightweight user/admin lookup context.

## Endpoint

```http
GET /api/v1/admin/suspensions
```

Full local URL:

```http
GET http://localhost:3000/api/v1/admin/suspensions?status=ACTIVE&page=1&limit=20
```

## Headers

```http
Authorization: Bearer OWNER_OR_ADMIN_ACCESS_TOKEN
```

## Query Params

```txt
status  optional, one of all, ACTIVE, LIFTED, EXPIRED; default all
page    optional, number between 1 and 10000; default 1
limit   optional, number between 1 and 100; default 20
```

Examples:

```http
GET /api/v1/admin/suspensions
GET /api/v1/admin/suspensions?status=all&page=1&limit=20
GET /api/v1/admin/suspensions?status=ACTIVE&page=1&limit=20
GET /api/v1/admin/suspensions?status=LIFTED&page=1&limit=20
GET /api/v1/admin/suspensions?status=EXPIRED&page=1&limit=20
```

## Auth Rules

Request is allowed only when:

- token is valid
- token user exists
- token user status is `ACTIVE`
- token user role is `OWNER` or `ADMIN`

## Status Filter Rules

`all`:

```js
{}
```

No status filter. Returns all suspension records.

`ACTIVE`:

```js
{
  status: "ACTIVE",
  expiresAt: { $gt: now }
}
```

Returns only active, unexpired suspensions.

`EXPIRED`:

```js
{
  $or: [
    { status: "EXPIRED" },
    {
      status: "ACTIVE",
      expiresAt: { $lte: now }
    }
  ]
}
```

Returns explicit `EXPIRED` records and active records whose expiry date has already passed.

`LIFTED`:

```js
{
  status: "LIFTED"
}
```

Returns lifted suspensions.

The service calculates `now` once per request and uses it for status matching.

## Sorting And Pagination

Rows are sorted newest first:

```js
{
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

## Lookup Behavior

Each suspension can include lightweight user context:

```txt
user       target user being suspended
createdBy  admin/owner who created the suspension
liftedBy   admin/owner who lifted the suspension
```

Lookup projection is intentionally small:

```json
{
  "_id": "user id",
  "name": "User Name",
  "email": "user@example.com",
  "role": "USER",
  "status": "ACTIVE"
}
```

Lookups preserve historical rows. If a referenced user no longer exists, the suspension is still returned and the enriched field is `null`.

Examples:

```json
{
  "user": null,
  "createdBy": null,
  "liftedBy": null
}
```

## Response Shape

Each row includes:

```json
{
  "_id": "6a5be1b8f278b758c0470291",
  "userId": "6a567af318a65af44ed99cde",
  "status": "ACTIVE",
  "reason": "Temporary suspension reason",
  "note": null,
  "startsAt": "2026-07-18T20:27:35.998Z",
  "expiresAt": "2026-07-27T00:00:00.000Z",
  "liftedAt": null,
  "liftReason": null,
  "createdAt": "2026-07-18T20:27:36.197Z",
  "updatedAt": "2026-07-18T20:27:36.197Z",
  "createdBy": {
    "_id": "6a5638c8fc6d6328c9e1b282",
    "name": "Test Owner User",
    "email": "test.owner.user@example.com",
    "role": "OWNER",
    "status": "ACTIVE"
  },
  "liftedBy": null,
  "user": {
    "_id": "6a567af318a65af44ed99cde",
    "name": "No Agent Profile User",
    "email": "no.agent.profile.user@example.com",
    "role": "USER",
    "status": "SUSPENDED"
  }
}
```

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
      "_id": "6a5be1b8f278b758c0470291",
      "userId": "6a567af318a65af44ed99cde",
      "status": "ACTIVE",
      "reason": "Temporary suspension reason",
      "note": null,
      "startsAt": "2026-07-18T20:27:35.998Z",
      "expiresAt": "2026-07-27T00:00:00.000Z",
      "liftedAt": null,
      "liftReason": null,
      "createdAt": "2026-07-18T20:27:36.197Z",
      "updatedAt": "2026-07-18T20:27:36.197Z",
      "createdBy": {
        "_id": "6a5638c8fc6d6328c9e1b282",
        "name": "Test Owner User",
        "email": "test.owner.user@example.com",
        "role": "OWNER",
        "status": "ACTIVE"
      },
      "liftedBy": null,
      "user": {
        "_id": "6a567af318a65af44ed99cde",
        "name": "No Agent Profile User",
        "email": "no.agent.profile.user@example.com",
        "role": "USER",
        "status": "SUSPENDED"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

Empty result:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0
  }
}
```

## Error Cases

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

Missing token user:

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

Invalid `status`:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid status: BAD"
}
```

Invalid `page`:

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

Invalid `limit`:

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

Non-numeric `limit`:

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

## Tested Checklist

Automated smoke tested:

- default query returns all statuses with default pagination
- `status=all`
- `page` and `limit` pagination
- `status=ACTIVE` returns only active unexpired suspensions
- `status=EXPIRED` returns explicit expired and active-past-expiry records
- `status=LIFTED` returns lifted records with `liftedBy` lookup
- missing target user lookup returns `user: null`
- missing `createdBy` lookup returns `createdBy: null`
- missing `liftedBy` lookup returns `liftedBy: null`
- invalid `status`
- page below range
- page above range
- limit below range
- limit above range
- non-numeric limit
- temporary users and suspensions clean up to zero

Postman tested:

- OWNER login
- default list
- `status=ACTIVE`
- `status=LIFTED`
- `status=EXPIRED`
- pagination beyond available rows
- invalid `status`
- page below range
- page above range
- limit below range
- limit above range
- non-numeric limit
- missing Authorization header
- malformed Authorization header
- invalid token
- non-admin forbidden
- suspended admin token
- inactive admin token
- missing token user
- Postman-created suspension and notification cleanup
