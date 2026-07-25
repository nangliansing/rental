# Get My Notifications

Return the authenticated user's visible notification inbox.

This endpoint is user-scoped. The frontend cannot choose another recipient, and expired notifications are hidden even if MongoDB has not removed them through the TTL index yet.

## Endpoint

```http
GET /api/v1/notifications/me
```

Full local URL:

```http
GET http://localhost:3000/api/v1/notifications/me
```

## Headers

```http
Authorization: Bearer ACCESS_TOKEN
```

## Query Parameters

All query parameters are optional.

| Name | Default | Notes |
| --- | --- | --- |
| `page` | `1` | Integer from `1` to `10000` |
| `limit` | `20` | Integer from `1` to `100` |
| `isRead` | none | Optional boolean query: `true` or `false` |

Examples:

```http
GET http://localhost:3000/api/v1/notifications/me
GET http://localhost:3000/api/v1/notifications/me?page=1&limit=2
GET http://localhost:3000/api/v1/notifications/me?isRead=false
GET http://localhost:3000/api/v1/notifications/me?isRead=true&page=1&limit=20
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
      "_id": "6a58d03f9d0e348abfdd801d",
      "recipient": "6a5638bafc6d6328c9e1b281",
      "actor": "6a5638c8fc6d6328c9e1b282",
      "type": "PENDING_LISTING_REJECTED",
      "title": "Listing not approved: your listing 13,800 THB/month at Reject Protected Field Residence",
      "message": "Your listing \"your listing 13,800 THB/month at Reject Protected Field Residence\" was not approved. Reason: Protected field reject test.",
      "entityType": "PENDING_LISTING",
      "entityId": "6a58d00c9d0e348abfdd801c",
      "link": "/profile",
      "metadata": {
        "pendingPostId": "6a58d00c9d0e348abfdd801c",
        "existingBuildingId": null,
        "buildingName": "Reject Protected Field Residence",
        "listingLabel": "your listing 13,800 THB/month at Reject Protected Field Residence",
        "reason": "Protected field reject test."
      },
      "isRead": false,
      "readAt": null,
      "expiresAt": "2026-08-15T12:36:15.650Z",
      "createdAt": "2026-07-16T12:36:15.652Z",
      "updatedAt": "2026-07-16T12:36:15.652Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 18
  },
  "unreadCount": 18
}
```

When no notifications match:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0
  },
  "unreadCount": 0
}
```

When the requested page is beyond available data:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 18
  },
  "unreadCount": 18
}
```

## Response Notes

`data` is sorted newest first:

```json
{
  "createdAt": "descending"
}
```

`pagination.total` is the total number of non-expired notifications matching the current filter.

`unreadCount` is the total number of non-expired unread notifications for the current user, regardless of the `isRead` filter.

For example, if `isRead=true` returns zero read notifications but the user has unread notifications:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0
  },
  "unreadCount": 18
}
```

## What The Backend Controls

The backend always uses:

- current user id from `req.currentUser._id`
- fresh active user loaded by `requireActiveUser`
- server-controlled recipient filter
- server-controlled expiry filter: `expiresAt > now`

Frontend cannot choose:

- `recipient`
- `actor`
- another user's notification inbox
- whether expired notifications are included

## Expiry And Indexes

The notification model has a TTL index:

```js
{ expiresAt: 1 }, { expireAfterSeconds: 0 }
```

MongoDB automatically removes notifications after `expiresAt`.

The endpoint also filters out expired notifications explicitly:

```js
{
  expiresAt: { $gt: now }
}
```

This keeps the inbox and unread badge correct during the small delay before MongoDB's TTL monitor physically deletes expired records.

The notification model also has indexes for this endpoint:

```js
{ recipient: 1, createdAt: -1, _id: 1 }
{ recipient: 1, isRead: 1, createdAt: -1, _id: 1 }
```

No new index is needed.

## What We Checked

- Caller must send a valid access token.
- Refresh token cannot be used as an access token.
- Caller must exist in the database.
- Caller must have `status: "ACTIVE"`.
- Suspended user receives `ACCOUNT_SUSPENDED`.
- Inactive user receives `ACCOUNT_INACTIVE`.
- Deleted user receives `USER_NOT_FOUND`.
- Default list returns the current user's notifications.
- User cannot see another user's notifications.
- Expired notifications are excluded from `data`.
- Expired unread notifications are excluded from `unreadCount`.
- Results are sorted newest first.
- Pagination works with `page` and `limit`.
- Page beyond total returns an empty array.
- `isRead=false` returns unread notifications only.
- `isRead=true` returns read notifications only.
- `unreadCount` is returned as a global non-expired unread count.
- Invalid `isRead` is rejected.
- Invalid `page` is rejected.
- Invalid `limit` is rejected.
- Missing access token is rejected.
- Malformed bearer token is rejected.
- Invalid access token is rejected.
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
401 Unauthorized
```

```json
{
  "success": false,
  "code": "USER_NOT_FOUND",
  "message": "User not found"
}
```

### Invalid isRead

Response:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "isRead must be a boolean"
}
```

### Invalid Page

Response:

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

### Invalid Limit

Response:

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
