# Admin Create Suspension

Create an account suspension for a user.

This endpoint is admin-only. It lets an `OWNER` or `ADMIN` restrict a normal user account until a future expiry date. The endpoint also updates the target user status to `SUSPENDED` and notifies the user.

## Endpoint

```http
POST /api/v1/admin/suspensions
```

Full local URL:

```http
POST http://localhost:3000/api/v1/admin/suspensions
```

## Headers

```http
Authorization: Bearer OWNER_OR_ADMIN_ACCESS_TOKEN
Content-Type: application/json
```

## Request Body

```json
{
  "userId": "6a566f7d466cac8bca4ed53e",
  "reason": "Temporary Postman suspension test.",
  "note": "Testing admin suspension create endpoint.",
  "startsAt": "2026-07-18T20:23:33.970Z",
  "expiresAt": "2026-07-26T00:00:00.000Z"
}
```

Fields:

```txt
userId     required, valid user id
reason     required, non-empty string, max 500 characters
note       optional string, max 1000 characters
startsAt   optional valid date, defaults to now
expiresAt  required valid future date, must be after startsAt
```

## Auth Rules

Request is allowed only when:

- token is valid
- token user exists
- token user status is `ACTIVE`
- token user role is `OWNER` or `ADMIN`

## Business Rules

Admins cannot suspend their own account:

```json
{
  "code": "CANNOT_SUSPEND_SELF"
}
```

Platform admin accounts cannot be suspended:

```txt
target role must not be OWNER or ADMIN
```

Users cannot have two active, unexpired suspensions:

```js
{
  userId,
  status: "ACTIVE",
  expiresAt: { $gt: now }
}
```

If that record already exists, the endpoint returns `ACTIVE_SUSPENSION_EXISTS`.

The operation is transactional. The backend:

1. validates the request body
2. validates the actor and target rules
3. checks for an existing active suspension
4. updates the target user status to `SUSPENDED`
5. creates the `ACTIVE` suspension record
6. creates a notification inside the transaction
7. emits the notification only after commit

`startsAt` and `expiresAt` validation uses one consistent timestamp for the request, so default `startsAt` and future-date checks do not drift during processing.

## Status Effects

Created suspension:

```json
{
  "status": "ACTIVE",
  "createdBy": "OWNER_OR_ADMIN_USER_ID",
  "liftedBy": null,
  "liftedAt": null,
  "liftReason": null
}
```

Target user:

```json
{
  "status": "SUSPENDED"
}
```

## Notifications

The suspended user receives one notification.

Notification creation happens inside the transaction. Socket emission happens only after the transaction commits.

Notification copy is intentionally simple and user-friendly:

```txt
Your account is restricted until Jul 26, 2026. Reason: Temporary Postman suspension test.
```

Notification metadata:

```json
{
  "suspensionId": "6a5be0c6f278b758c047028f",
  "reason": "Temporary Postman suspension test.",
  "expiresAt": "2026-07-26T00:00:00.000Z"
}
```

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
    "suspension": {
      "userId": "6a566f7d466cac8bca4ed53e",
      "status": "ACTIVE",
      "reason": "Temporary Postman suspension test.",
      "note": "Testing admin suspension create endpoint.",
      "startsAt": "2026-07-18T20:23:33.970Z",
      "expiresAt": "2026-07-26T00:00:00.000Z",
      "createdBy": "6a5638c8fc6d6328c9e1b282",
      "liftedBy": null,
      "liftedAt": null,
      "liftReason": null,
      "_id": "6a5be0c6f278b758c047028f",
      "createdAt": "2026-07-18T20:23:34.157Z",
      "updatedAt": "2026-07-18T20:23:34.157Z"
    },
    "user": {
      "_id": "6a566f7d466cac8bca4ed53e",
      "name": "Line Only Agent User",
      "email": "line.only.agent.user@example.com",
      "authProvider": "PASSWORD",
      "role": "USER",
      "status": "SUSPENDED",
      "createdAt": "2026-07-14T17:18:53.745Z",
      "updatedAt": "2026-07-18T20:23:34.084Z"
    }
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

Invalid `userId`:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "userId must be a valid id"
}
```

Target user not found:

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

Duplicate active suspension:

```http
409 Conflict
```

```json
{
  "success": false,
  "code": "ACTIVE_SUSPENSION_EXISTS",
  "message": "User already has an active suspension"
}
```

Self-suspension:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "CANNOT_SUSPEND_SELF",
  "message": "You cannot suspend your own account"
}
```

Missing `reason`:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reason must be a string"
}
```

Empty `reason`:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reason is required"
}
```

Long `reason`:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "reason must be at most 500 characters"
}
```

Long `note`:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "note must be at most 1000 characters"
}
```

Missing `expiresAt`:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "expiresAt is required"
}
```

Invalid `expiresAt`:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "expiresAt must be a valid date"
}
```

`expiresAt` not after `startsAt`:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "expiresAt must be after startsAt"
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

Malformed JSON:

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

## Tested Checklist

Automated smoke tested:

- success creates an `ACTIVE` suspension
- success changes target user status to `SUSPENDED`
- success creates a `USER_SUSPENDED` notification
- duplicate active suspension returns `ACTIVE_SUSPENSION_EXISTS`
- self-suspension returns `CANNOT_SUSPEND_SELF`
- platform admin target returns `CANNOT_SUSPEND_PLATFORM_ADMIN`
- missing target user returns `USER_NOT_FOUND`
- invalid `userId` returns `VALIDATION_ERROR`
- missing `reason` returns `VALIDATION_ERROR`
- past `expiresAt` is rejected
- `expiresAt` before `startsAt` is rejected
- long `note` is rejected
- inactive non-admin target can be suspended and becomes `SUSPENDED`
- test-created users, suspensions, and notifications clean up to zero

Postman tested:

- OWNER login
- success create
- duplicate active suspension
- self-suspension
- invalid `userId`
- missing target user
- missing `reason`
- empty `reason`
- past `expiresAt`
- explicit `expiresAt` before `startsAt`
- invalid `expiresAt`
- missing `expiresAt`
- long `reason`
- long `note`
- body array
- malformed JSON
- missing Authorization header
- malformed Authorization header
- invalid token
- non-admin forbidden
- suspended admin token
- inactive admin token
- missing token user
- Postman-created suspension and notification cleanup
