# Close My Saved Search

Transition a non-deleted, Waiting saved search owned by the authenticated user to `Closed`.

This is the only owner endpoint that updates `status`. The general PATCH update endpoint rejects `status`.

## Endpoint

```http
PATCH /api/v1/saved-searches/:savedSearchId/status
```

Full local URL:

```http
PATCH http://localhost:3000/api/v1/saved-searches/6a70f2002c0e518d5b689200/status
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

## Path Parameters

| Name | Required | Validation |
| --- | --- | --- |
| `savedSearchId` | yes | Valid MongoDB ObjectId |

## Request Body

```json
{
  "status": "Closed"
}
```

| Field | Required | Validation |
| --- | --- | --- |
| `status` | yes | Must be exactly `Closed` |

Unknown fields are rejected. `Waiting` is not accepted on this endpoint (create already sets Waiting).

## Business Rules

The write filter requires all of:

```js
{
  _id: savedSearchId,
  createdBy: currentUserId,
  isDeleted: false,
  status: "Waiting"
}
```

Then atomically sets:

```js
{
  status: "Closed"
}
```

Error mapping when the write matches nothing:

- owned + not deleted + already `Closed` → `409 SAVED_SEARCH_CLOSED`
- missing / wrong owner / soft-deleted → `404 SAVED_SEARCH_NOT_FOUND`

## Session

Optional Mongo session is accepted when present (`req.dbSession`).

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
    "name": "Sukhumvit 2BR",
    "status": "Closed",
    "isDeleted": false,
    "deletedAt": null
  }
}
```

## Error Responses

Missing or invalid access token → `401`

Inactive / suspended account → `403`

Not found / wrong owner / soft-deleted:

```http
404 Not Found
```

```json
{
  "success": false,
  "code": "SAVED_SEARCH_NOT_FOUND",
  "message": "Saved search not found"
}
```

Already closed:

```http
409 Conflict
```

```json
{
  "success": false,
  "code": "SAVED_SEARCH_CLOSED",
  "message": "Closed saved searches cannot be updated"
}
```

Invalid body / id:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "status must be Closed"
}
```

## Manual Test Checklist

- [ ] Owner can close a Waiting request
- [ ] Already Closed returns `409 SAVED_SEARCH_CLOSED`
- [ ] Soft-deleted / other user's id returns `404`
- [ ] Body `status: Waiting` or unknown fields returns `422`
- [ ] Closed request cannot be PATCH-updated afterward
