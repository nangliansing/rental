# Admin Remove Admin Role

Remove platform admin access from an `ADMIN` user.

This endpoint is owner-only. It lets a platform `OWNER` demote an `ADMIN` account back to a normal `USER` account. It must not change `OWNER` accounts.

## Endpoint

```http
PATCH /api/v1/admin/users/:userId/remove-admin
```

Full local URL:

```http
PATCH http://localhost:3000/api/v1/admin/users/6a5ce1ca25b17d102eb825be/remove-admin
```

## Headers

```http
Authorization: Bearer OWNER_ACCESS_TOKEN
```

## Path Params

```txt
userId  required, valid user id
```

## Request Body

No request body is required.

## Auth Rules

Request is allowed only when:

- token is valid
- token user exists
- token user status is `ACTIVE`
- token user role is `OWNER`

The parent admin route middleware handles authentication, active-account checks, and broad admin access. This route adds a stricter owner-only guard:

```js
authorizeRoles(USER_ROLES.OWNER)
```

An `ADMIN` actor is forbidden from using this endpoint.

## Target Rules

Only target users with this role can be changed:

```txt
role: ADMIN
```

The target update match is intentionally strict:

```js
{
  _id: userId,
  role: USER_ROLES.ADMIN
}
```

The endpoint does not demote `OWNER` accounts. It also rejects normal `USER` accounts and already-demoted users with the same not-found style response.

## Role Change

The endpoint changes:

```json
{
  "role": "ADMIN"
}
```

to:

```json
{
  "role": "USER"
}
```

The user account remains active unless another moderation action changes its status.

## Projection

The response uses the shared safe admin user projection:

```json
{
  "_id": "user id",
  "name": "User Name",
  "email": "user@example.com",
  "authProvider": "PASSWORD",
  "role": "USER",
  "status": "ACTIVE",
  "createdAt": "2026-07-19T14:40:10.032Z",
  "updatedAt": "2026-07-19T14:41:58.587Z"
}
```

`password` must never appear in the response.

## Notification

The demoted user receives a notification after the transaction commits.

Notification payload:

```json
{
  "recipient": "demoted user id",
  "actor": "owner id",
  "type": "ADMIN_ROLE_REMOVED",
  "title": "Admin access removed",
  "message": "Your admin access was removed. You can still use your account.",
  "entityType": "USER",
  "entityId": "demoted user id",
  "link": "/profile",
  "metadata": {
    "userId": "demoted user id",
    "removedRole": "ADMIN",
    "newRole": "USER"
  }
}
```

Notification wording should stay simple, clear, and user-friendly.

## Transaction Flow

The service:

1. validates `session`
2. validates target `userId`
3. validates actor id as `removedBy`
4. starts a transaction when no external session is provided
5. atomically updates only a target with `role: ADMIN`
6. returns `ADMIN_USER_NOT_FOUND` when the target is missing, not an admin, already demoted, or an owner
7. creates the `ADMIN_ROLE_REMOVED` notification in the same transaction
8. commits the transaction
9. emits the socket notification after commit
10. returns the safe demoted user projection

The update uses:

```js
User.findOneAndUpdate(
  {
    _id: userId,
    role: USER_ROLES.ADMIN
  },
  {
    $set: {
      role: USER_ROLES.USER
    }
  },
  {
    returnDocument: "after",
    runValidators: true,
    projection: buildAdminUserProjection()
  }
)
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
    "_id": "6a5ce1ca25b17d102eb825be",
    "name": "TEMP Postman Remove Admin Target",
    "email": "tmp.postman.remove.admin.target@example.com",
    "authProvider": "PASSWORD",
    "role": "USER",
    "status": "ACTIVE",
    "createdAt": "2026-07-19T14:40:10.032Z",
    "updatedAt": "2026-07-19T14:41:58.587Z"
  }
}
```

## Error Cases

Invalid user id:

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

Target user not found, not an admin, already demoted, or owner target:

```http
404 Not Found
```

```json
{
  "success": false,
  "code": "ADMIN_USER_NOT_FOUND",
  "message": "User not found or is not an admin"
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

Admin actor, normal user actor, or any non-owner actor:

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

Suspended owner token user:

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

Inactive owner token user:

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

Missing owner token user:

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

Backend smoke:

- service demotes `ADMIN` target to `USER`
- service returns safe user without `password`
- service creates user-friendly notification
- service rejects invalid target `userId`
- service rejects invalid actor id
- service protects `OWNER` target
- service rejects normal `USER` target
- HTTP `OWNER` can demote `ADMIN`
- HTTP success creates notification
- duplicate remove returns `ADMIN_USER_NOT_FOUND`
- invalid `userId` returns `VALIDATION_ERROR`
- missing target user returns `ADMIN_USER_NOT_FOUND`
- `OWNER` target cannot be changed
- normal `USER` target is rejected
- `ADMIN` actor is forbidden
- normal `USER` actor is forbidden
- missing token returns `ACCESS_TOKEN_REQUIRED`
- malformed bearer returns `ACCESS_TOKEN_REQUIRED`
- invalid token returns `INVALID_ACCESS_TOKEN`
- suspended `OWNER` actor returns `ACCOUNT_SUSPENDED`
- inactive `OWNER` actor returns `ACCOUNT_INACTIVE`
- missing owner token user returns `USER_NOT_FOUND`
- temporary users and notifications removed
- owner fixture restored to `role: OWNER`, `status: ACTIVE`

Postman:

- owner login
- owner successfully demotes admin to user
- duplicate remove rejected
- invalid `userId`
- missing target user
- owner target protected
- user target rejected
- admin actor forbidden
- user actor forbidden
- missing token
- malformed bearer header
- invalid token
- suspended owner actor
- inactive owner actor
- missing owner token user
- temporary Postman users and notifications removed
- owner fixture verified as `role: OWNER`, `status: ACTIVE`
