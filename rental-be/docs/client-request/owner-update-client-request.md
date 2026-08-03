# Update My Client Request

Partially update a non-deleted, non-closed client request owned by the authenticated user.

Ownership, status transitions, deletion metadata, and timestamps are controlled by the backend.

## Endpoint

```http
PATCH /api/v1/client-requests/:clientRequestId
```

Full local URL:

```http
PATCH http://localhost:3000/api/v1/client-requests/6a70f2002c0e518d5b689200
```

## Auth

Requires an active user access token.

```http
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

The route uses:

```txt
authenticate
requireActiveUser
```

Suspended, inactive, deleted, or missing users cannot access this endpoint.

## Path Parameters

| Name | Required | Validation |
| --- | --- | --- |
| `clientRequestId` | yes | Valid MongoDB ObjectId |

## Request Body

The body must be a JSON object containing at least one actual change.

Send only the fields that should change:

```json
{
  "name": "Sukhumvit 2BR updated",
  "description": "Updated notes for the client.",
  "geoSearch": {
    "mode": "nearby",
    "position": { "lat": 13.7308, "lng": 100.5418 },
    "radiusMeters": 800,
    "placeName": "Siam"
  },
  "filters": {
    "minRent": 18000,
    "maxRent": 40000,
    "bedroomCount": 2,
    "isForeignerAccepted": true
  }
}
```

### Editable Fields

| Field | Validation |
| --- | --- |
| `name` | required string when sent, 1..120 characters after trim |
| `description` | `null` or string, max 2000 characters; blank becomes `null` |
| `geoSearch` | full geo-search object (`area`, `nearby`, or `line`); same rules as create |
| `filters` | full filters object; same rules as create / map search |

Notes:

- Omitted fields are left unchanged.
- When `filters` is sent, it replaces the stored filters object (it is not merged field-by-field).
- When `geoSearch` is sent, it replaces the stored geo search object.
- Empty or whitespace-only `description` / `placeName` values are normalized to `null`.
- Geo/filter field rules are shared with [`create-client-request.md`](./create-client-request.md).

### Immutable / Rejected Fields

These fields cannot be updated through this endpoint. Sending them returns `422 VALIDATION_ERROR`:

```txt
createdBy
status
isDeleted
deletedAt
_id
createdAt
updatedAt
```

`status` changes use [`owner-update-client-request-status.md`](./owner-update-client-request-status.md). This endpoint never updates `createdBy`.

## Business Rules

1. Caller must own the client request (`createdBy === req.currentUser._id`)
2. Soft-deleted client requests cannot be updated (treated as not found)
3. Closed client requests cannot be updated
4. Body must include at least one real value change
5. Ownership and soft-delete are enforced in both the read and write filters
6. The write filter also requires `status: "Waiting"` to avoid races with a concurrent close
7. Optional Mongo session is accepted when present (`req.dbSession`)

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
    "_id": "6a70f2002c0e518d5b689200",
    "createdBy": "6a5638bafc6d6328c9e1b281",
    "name": "Sukhumvit 2BR updated",
    "description": "Updated notes for the client.",
    "status": "Waiting",
    "geoSearch": {
      "mode": "nearby",
      "position": { "lat": 13.7308, "lng": 100.5418 },
      "radiusMeters": 800,
      "placeName": "Siam"
    },
    "filters": {
      "minRent": 18000,
      "maxRent": 40000,
      "bedroomCount": 2,
      "isForeignerAccepted": true
    },
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-08-03T18:00:00.000Z",
    "updatedAt": "2026-08-03T18:10:00.000Z"
  }
}
```

## Error Responses

Missing or invalid access token:

```http
401 Unauthorized
```

Inactive / suspended account:

```http
403 Forbidden
```

Client request not found, owned by someone else, or soft-deleted:

```http
404 Not Found
```

```json
{
  "success": false,
  "code": "CLIENT_REQUEST_NOT_FOUND",
  "message": "Client request not found"
}
```

Client request is closed:

```http
409 Conflict
```

```json
{
  "success": false,
  "code": "CLIENT_REQUEST_CLOSED",
  "message": "Closed client requests cannot be updated"
}
```

No real change:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "NO_VALID_CHANGE",
  "message": "No valid change"
}
```

Unknown / invalid fields:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Unknown fields: status, createdBy"
}
```

Invalid path id:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "clientRequestId must be a valid id"
}
```

## Manual Test Checklist

- [ ] Update `name` only succeeds for the owner
- [ ] Update `geoSearch` / `filters` replaces those objects
- [ ] Same-value body returns `422 NO_VALID_CHANGE`
- [ ] Unknown fields such as `status` / `createdBy` return `422 VALIDATION_ERROR`
- [ ] Another user's id returns `404 CLIENT_REQUEST_NOT_FOUND`
- [ ] Soft-deleted request returns `404 CLIENT_REQUEST_NOT_FOUND`
- [ ] Closed request returns `409 CLIENT_REQUEST_CLOSED`
- [ ] Suspended / inactive users are rejected before update
