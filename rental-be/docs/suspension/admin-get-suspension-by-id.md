# Admin Get Suspension By Id

Get one account suspension with lightweight user/admin context.

This endpoint is admin-only. It lets an `OWNER` or `ADMIN` inspect one suspension record, including the suspended user, the admin who created it, and the admin who lifted it when applicable.

## Endpoint

```http
GET /api/v1/admin/suspensions/:suspensionId
```

Full local URL:

```http
GET http://localhost:3000/api/v1/admin/suspensions/6a5cc4b3375159f93d3d9f0e
```

## Headers

```http
Authorization: Bearer OWNER_OR_ADMIN_ACCESS_TOKEN
```

## Path Params

```txt
suspensionId  required, valid suspension id
```

## Auth Rules

Request is allowed only when:

- token is valid
- token user exists
- token user status is `ACTIVE`
- token user role is `OWNER` or `ADMIN`

Auth, active-account checks, and role authorization are handled by the shared admin route middleware. The endpoint service only handles id validation, lookup, and not-found behavior.

## Lookup Behavior

The endpoint reuses the same suspension lookup pipeline as the admin suspension list.

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

Lookups preserve historical records. If a referenced user no longer exists, the suspension is still returned and the enriched field is `null`.

Examples:

```json
{
  "user": null,
  "createdBy": null,
  "liftedBy": null
}
```

This is intentional because the suspension record is the source of truth, while related user/admin accounts may be removed later.

## Query Flow

The service:

1. validates `suspensionId`
2. matches suspension by `_id`
3. limits to one record
4. enriches `user`, `createdBy`, and `liftedBy`
5. preserves missing lookup records as `null`
6. returns `SUSPENSION_NOT_FOUND` when no suspension exists

The shared detail pipeline is:

```js
[
  { $match: { _id: suspensionId } },
  { $limit: 1 },
  ...buildAdminSuspensionLookupStages()
]
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
  "data": {
    "_id": "6a5cc4b3375159f93d3d9f0e",
    "userId": "6a566f7d466cac8bca4ed53e",
    "status": "ACTIVE",
    "reason": "TEMP Postman admin suspension detail test.",
    "note": "Testing GET admin suspension detail endpoint.",
    "startsAt": "2026-07-19T12:36:03.166Z",
    "expiresAt": "2026-07-26T00:00:00.000Z",
    "liftedAt": null,
    "liftReason": null,
    "createdAt": "2026-07-19T12:36:03.399Z",
    "updatedAt": "2026-07-19T12:36:03.399Z",
    "createdBy": {
      "_id": "6a5638c8fc6d6328c9e1b282",
      "name": "Test Owner User",
      "email": "test.owner.user@example.com",
      "role": "OWNER",
      "status": "ACTIVE"
    },
    "liftedBy": null,
    "user": {
      "_id": "6a566f7d466cac8bca4ed53e",
      "name": "Line Only Agent User",
      "email": "line.only.agent.user@example.com",
      "role": "USER",
      "status": "SUSPENDED"
    }
  }
}
```

## Error Cases

Invalid suspension id:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "suspensionId must be a valid id"
}
```

Suspension not found:

```http
404 Not Found
```

```json
{
  "success": false,
  "code": "SUSPENSION_NOT_FOUND",
  "message": "Suspension not found"
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

- valid active suspension detail
- valid lifted suspension detail
- missing target user lookup returns `user: null`
- missing creator admin lookup returns `createdBy: null`
- missing lifted admin lookup returns `liftedBy: null`
- invalid `suspensionId`
- missing suspension
- missing token
- malformed bearer header
- invalid token
- non-admin user
- suspended admin token user
- inactive admin token user
- missing admin token user
- temporary data cleanup

Postman covered:

- `200` success detail
- invalid `suspensionId`
- valid-format missing suspension
- missing token
- malformed bearer header
- invalid token
- normal user forbidden
- suspended admin
- inactive admin
- missing admin user
- temporary suspension cleanup and target user restore
