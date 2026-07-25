# Admin Lift Suspension

Lift an active account suspension.

This endpoint is admin-only. It lets an `OWNER` or `ADMIN` end a currently active suspension, record who lifted it, restore the user when appropriate, and notify the user.

## Endpoint

```http
PATCH /api/v1/admin/suspensions/:suspensionId/lift
```

Full local URL:

```http
PATCH http://localhost:3000/api/v1/admin/suspensions/6a5cca0d953db668f542f5c3/lift
```

## Headers

```http
Authorization: Bearer OWNER_OR_ADMIN_ACCESS_TOKEN
Content-Type: application/json
```

## Path Params

```txt
suspensionId  required, valid suspension id
```

## Request Body

```json
{
  "liftReason": "Postman lift suspension success test."
}
```

Fields:

```txt
liftReason  required string, non-empty after trim, max 1000 characters
```

## Auth Rules

Request is allowed only when:

- token is valid
- token user exists
- token user status is `ACTIVE`
- token user role is `OWNER` or `ADMIN`

Auth, active-account checks, and role authorization are handled by the shared admin route middleware.

## Business Rules

Only currently active, unexpired suspensions can be lifted.

Allowed:

```js
{
  status: "ACTIVE",
  expiresAt: { $gt: now }
}
```

Rejected:

```txt
already LIFTED       -> SUSPENSION_ALREADY_LIFTED
EXPIRED status       -> SUSPENSION_NOT_ACTIVE
ACTIVE but expired   -> SUSPENSION_NOT_ACTIVE
missing suspension   -> SUSPENSION_NOT_FOUND
```

When a suspension is lifted, the backend sets:

```json
{
  "status": "LIFTED",
  "liftedBy": "OWNER_OR_ADMIN_USER_ID",
  "liftedAt": "current timestamp",
  "liftReason": "Postman lift suspension success test."
}
```

The target user is restored to `ACTIVE` only when they have no other active, unexpired suspension.

If another active suspension still exists for the user, the lifted suspension is updated but the user remains:

```json
{
  "status": "SUSPENDED"
}
```

This protects account state if historical data was manually changed or future rules allow multiple active suspensions.

## Transaction Flow

The operation is transactional. The backend:

1. validates `suspensionId`
2. validates `liftReason`
3. loads the suspension
4. rejects already-lifted or non-active suspensions
5. atomically updates the suspension to `LIFTED`
6. checks whether another active, unexpired suspension remains for the user
7. restores the user to `ACTIVE` only when safe
8. loads the enriched suspension detail with shared lookup stages
9. creates a notification inside the transaction
10. emits the notification only after commit

## Lookup Behavior

The response suspension uses the same enriched shape as:

```http
GET /api/v1/admin/suspensions
GET /api/v1/admin/suspensions/:suspensionId
```

It includes lightweight lookup objects:

```txt
user       target user
createdBy  admin/owner who created the suspension
liftedBy   admin/owner who lifted the suspension
```

Lookup projection:

```json
{
  "_id": "user id",
  "name": "User Name",
  "email": "user@example.com",
  "role": "OWNER",
  "status": "ACTIVE"
}
```

If a historical lookup user is missing, the enriched field is preserved as `null`.

## Notifications

The suspended user receives one notification when the lift succeeds.

Notification creation happens inside the transaction. Socket emission happens only after the transaction commits.

Notification copy is intentionally simple and user-friendly:

```txt
Your account restriction has been lifted. You can use your account again. Reason: Postman lift suspension success test.
```

Notification metadata:

```json
{
  "suspensionId": "6a5cca0d953db668f542f5c3",
  "reason": "Postman lift suspension success test."
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
  "data": {
    "suspension": {
      "_id": "6a5cca0d953db668f542f5c3",
      "userId": "6a566f7d466cac8bca4ed53e",
      "status": "LIFTED",
      "reason": "TEMP Postman admin lift suspension test.",
      "note": "Testing PATCH admin suspension lift endpoint.",
      "startsAt": "2026-07-19T12:58:53.455Z",
      "expiresAt": "2026-07-26T00:00:00.000Z",
      "liftedAt": "2026-07-19T12:59:34.978Z",
      "liftReason": "Postman lift suspension success test.",
      "createdAt": "2026-07-19T12:58:53.675Z",
      "updatedAt": "2026-07-19T12:59:35.045Z",
      "createdBy": {
        "_id": "6a5638c8fc6d6328c9e1b282",
        "name": "Test Owner User",
        "email": "test.owner.user@example.com",
        "role": "OWNER",
        "status": "ACTIVE"
      },
      "liftedBy": {
        "_id": "6a5638c8fc6d6328c9e1b282",
        "name": "Test Owner User",
        "email": "test.owner.user@example.com",
        "role": "OWNER",
        "status": "ACTIVE"
      },
      "user": {
        "_id": "6a566f7d466cac8bca4ed53e",
        "name": "Line Only Agent User",
        "email": "line.only.agent.user@example.com",
        "role": "USER",
        "status": "ACTIVE"
      }
    },
    "user": {
      "_id": "6a566f7d466cac8bca4ed53e",
      "name": "Line Only Agent User",
      "email": "line.only.agent.user@example.com",
      "authProvider": "PASSWORD",
      "role": "USER",
      "status": "ACTIVE",
      "createdAt": "2026-07-14T17:18:53.745Z",
      "updatedAt": "2026-07-19T12:59:35.177Z"
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

Already lifted:

```http
409 Conflict
```

```json
{
  "success": false,
  "code": "SUSPENSION_ALREADY_LIFTED",
  "message": "Suspension is already lifted"
}
```

Expired or not active:

```http
409 Conflict
```

```json
{
  "success": false,
  "code": "SUSPENSION_NOT_ACTIVE",
  "message": "Only active suspensions can be lifted"
}
```

Missing or non-string `liftReason`:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "liftReason must be a string"
}
```

Empty `liftReason`:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "liftReason is required"
}
```

Too-long `liftReason`:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "liftReason must be at most 1000 characters"
}
```

Target user missing:

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

Invalid JSON:

```http
400 Bad Request
```

```json
{
  "success": false,
  "code": "INVALID_JSON",
  "message": "Request body must be valid JSON"
}
```

Body is not an object:

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

## Tested Checklist

Backend smoke covered:

- successful active suspension lift
- enriched response includes `createdBy`, `liftedBy`, and `user`
- user restored to `ACTIVE` when no other active suspension exists
- notification created with simple copy
- repeat lift returns `SUSPENSION_ALREADY_LIFTED`
- already lifted suspension returns `SUSPENSION_ALREADY_LIFTED`
- expired active suspension returns `SUSPENSION_NOT_ACTIVE`
- missing target user returns `USER_NOT_FOUND`
- missing suspension returns `SUSPENSION_NOT_FOUND`
- invalid `suspensionId`
- missing `liftReason`
- user remains `SUSPENDED` when another active suspension still exists
- missing token
- malformed bearer header
- invalid token
- non-admin user
- suspended admin token user
- inactive admin token user
- missing admin token user
- temporary data cleanup

Postman covered:

- `200` success lift
- repeat lift
- invalid `suspensionId`
- valid-format missing suspension
- missing, non-string, empty, and too-long `liftReason`
- valid lift after validation tests
- expired active suspension
- missing token
- malformed bearer header
- invalid token
- normal user forbidden
- suspended admin
- inactive admin
- missing admin user
- temporary suspension, notification, and target-user cleanup
