# Get My Saved Search By Id

Fetch a single non-deleted saved search owned by the authenticated user.

## Endpoint

```http
GET /api/v1/saved-searches/:savedSearchId
```

Full local URL:

```http
GET http://localhost:3000/api/v1/saved-searches/6a70f2002c0e518d5b689200
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

## Ownership And Soft Delete

The query matches:

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
- the saved search is soft-deleted

Closed (`status: "Closed"`) requests are still returned when owned and not deleted.

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
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-08-03T18:00:00.000Z",
    "updatedAt": "2026-08-03T18:00:00.000Z"
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

Saved search not found, owned by someone else, or soft-deleted:

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

- [ ] Owner can fetch their Waiting request
- [ ] Owner can fetch their Closed request
- [ ] Soft-deleted request returns `404 SAVED_SEARCH_NOT_FOUND`
- [ ] Another user's id returns `404 SAVED_SEARCH_NOT_FOUND`
- [ ] Invalid id returns `422 VALIDATION_ERROR`
- [ ] Suspended / inactive users are rejected
