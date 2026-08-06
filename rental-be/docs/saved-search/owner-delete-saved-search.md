# Delete My Saved Search

Soft-delete a non-deleted saved search owned by the authenticated user.

The record is retained. Soft-deleted requests are excluded from owner update and future list/search queries that filter on `isDeleted: false`.

## Endpoint

```http
DELETE /api/v1/saved-searches/:savedSearchId
```

Full local URL:

```http
DELETE http://localhost:3000/api/v1/saved-searches/6a70f2002c0e518d5b689200
```

## Auth

Requires an active user access token.

```http
Authorization: Bearer ACCESS_TOKEN
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
| `savedSearchId` | yes | Valid MongoDB ObjectId |

## Request Body

No request body is required. Clients should omit it.

## Ownership And Availability

The saved search must match all of the following in one atomic write filter:

```js
{
  _id: savedSearchId,
  createdBy: currentUserId,
  isDeleted: false
}
```

These cases all return the same `SAVED_SEARCH_NOT_FOUND` response:

- the saved search does not exist
- the saved search belongs to another user
- the saved search is already soft-deleted

Using one response prevents disclosure of another user's request or ownership information. A repeated delete therefore returns `404` rather than reporting success again.

Closed (`status: "Closed"`) requests may still be soft-deleted by their owner.

## Soft-Delete Behavior

The endpoint atomically applies:

```js
{
  isDeleted: true,
  deletedAt: currentDate
}
```

The endpoint does not permanently remove the record.

`createdBy` and `status` are left unchanged.

## Session

Optional Mongo session is accepted when present (`req.dbSession`). Because this is a single-document write, the service does not open its own transaction.

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
    "description": "Near BTS",
    "status": "Waiting",
    "geoSearch": {
      "mode": "area",
      "bounds": {
        "northEast": { "lat": 13.78, "lng": 100.66 },
        "southWest": { "lat": 13.75, "lng": 100.62 }
      },
      "placeName": "Phrom Phong"
    },
    "filters": {
      "minRent": 15000,
      "maxRent": 35000
    },
    "isDeleted": true,
    "deletedAt": "2026-08-03T21:30:00.000Z",
    "createdAt": "2026-08-03T18:00:00.000Z",
    "updatedAt": "2026-08-03T21:30:00.000Z"
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

Saved search not found, owned by someone else, or already soft-deleted:

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

Invalid path id:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "savedSearchId must be a valid id"
}
```

## Manual Test Checklist

- [ ] Owner can soft-delete their Waiting request
- [ ] Owner can soft-delete their Closed request
- [ ] Already-deleted request returns `404 SAVED_SEARCH_NOT_FOUND`
- [ ] Another user's id returns `404 SAVED_SEARCH_NOT_FOUND`
- [ ] Soft-deleted request cannot be updated afterward
- [ ] Suspended / inactive users are rejected before delete
