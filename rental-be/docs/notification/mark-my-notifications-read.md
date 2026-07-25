# Mark My Notifications Read

Mark all visible unread notifications for the authenticated user as read.

This endpoint is user-scoped. The frontend cannot choose another recipient, and expired notifications are ignored even if MongoDB has not removed them through the TTL index yet.

## Endpoint

```http
PATCH /api/v1/notifications/me/read-all
```

Full local URL:

```http
PATCH http://localhost:3000/api/v1/notifications/me/read-all
```

## Headers

```http
Authorization: Bearer ACCESS_TOKEN
```

## Request Body

No request body is required.

Do not send notification ids or recipient ids. The backend always uses the authenticated user from the access token.

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
    "matchedCount": 18,
    "modifiedCount": 18
  }
}
```

If all notifications are already read, the endpoint is still successful:

```json
{
  "success": true,
  "data": {
    "matchedCount": 0,
    "modifiedCount": 0
  }
}
```

## Response Notes

`matchedCount` is the number of non-expired unread notifications found for the current user.

`modifiedCount` is the number of non-expired unread notifications updated to read.

The endpoint only updates notifications matching:

```js
{
  recipient: req.currentUser._id,
  isRead: false,
  expiresAt: { $gt: now }
}
```

Updated notifications receive:

```js
{
  isRead: true,
  readAt: now
}
```

Already-read notifications are not updated, so their existing `readAt` timestamp is preserved.

Expired unread notifications are not updated and remain hidden from `GET /api/v1/notifications/me`.

## What The Backend Controls

The backend always uses:

- current user id from `req.currentUser._id`
- fresh active user loaded by `requireActiveUser`
- server-controlled recipient filter
- server-controlled expiry filter: `expiresAt > now`
- server-generated `readAt`

Frontend cannot choose:

- `recipient`
- another user's notifications
- `readAt`
- which unread notifications are included
- whether expired notifications are included

## Indexes

The notification model already has an index for this update:

```js
{ recipient: 1, isRead: 1, createdAt: -1, _id: 1 }
```

The update filter uses the leading fields `recipient` and `isRead`, so no new index is needed.

The notification model also has a TTL index:

```js
{ expiresAt: 1 }, { expireAfterSeconds: 0 }
```

The service still filters by `expiresAt > now` because MongoDB's TTL deletion can lag behind the expiry time.

## What We Checked

- Caller must send a valid access token.
- Refresh token cannot be used as an access token.
- Caller must exist in the database.
- Caller must have `status: "ACTIVE"`.
- Suspended user receives `ACCOUNT_SUSPENDED`.
- Inactive user receives `ACCOUNT_INACTIVE`.
- Deleted user receives `USER_NOT_FOUND`.
- Active user can mark all visible unread notifications as read.
- `matchedCount` and `modifiedCount` reflect the visible unread notification count.
- Expired unread notifications are not matched or modified.
- Already-read notifications are not modified.
- Calling the endpoint again is idempotent and returns `0` counts.
- `GET /api/v1/notifications/me` returns `unreadCount: 0` after marking read.
- `GET /api/v1/notifications/me?isRead=false` returns no unread notifications after marking read.
- `GET /api/v1/notifications/me?isRead=true` returns read notifications with `readAt`.
- Missing access token is rejected.
- Malformed bearer token is rejected.
- Invalid access token is rejected.
- Postman verified successful mark-read, idempotency, GET verification, read/unread filters, auth failures, user-state failures, and fixture restore.
- Query uses the passed session when a valid session is provided.

## Error Cases

### Missing Access Token

Response:

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

### Invalid Access Token

Response:

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

### Suspended User

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

### Inactive User

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

### Deleted User

Response:

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
