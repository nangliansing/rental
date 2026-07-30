# Delete Building Follow

Unfollow a building for the authenticated user.

This endpoint is user-scoped. The caller cannot remove another user's follow.

## Endpoint

```http
DELETE /api/v1/building-follows/:buildingId
```

Full local URL:

```http
DELETE http://localhost:3000/api/v1/building-follows/6a57c6da947d934e03495b7a
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

## Path Params

```txt
buildingId  required, valid Mongo ObjectId
```

## Request Body

No request body is required.

## Success Response

Status:

```http
200 OK
```

Body:

```json
{
  "success": true,
  "data": {
    "_id": "6a5f1c2d4e8b9a0123456789",
    "userId": "6a5638bafc6d6328c9e1b281",
    "buildingId": "6a57c6da947d934e03495b7a",
    "createdAt": "2026-07-31T10:15:30.123Z",
    "updatedAt": "2026-07-31T10:15:30.123Z"
  }
}
```

The follow record is hard-deleted.

## Error Cases

### Follow Not Found

Status:

```http
404 Not Found
```

```json
{
  "success": false,
  "code": "BUILDING_FOLLOW_NOT_FOUND",
  "message": "Building follow not found"
}
```

This applies when:

- the user never followed the building
- the user already unfollowed the building

### Invalid Building Id

Status:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "buildingId must be a valid id"
}
```

## Business Rules

Unfollow succeeds even when the building later becomes inactive or is deleted after the follow was created.

Unfollow only removes the authenticated user's follow. Other users' follows are unchanged.

## Tested Checklist

```txt
removes an existing follow
returns 404 when the user is not following the building
returns 404 on a second unfollow attempt
does not remove another user's follow
unfollows when the building later becomes inactive
unfollows when the building was deleted after follow
returns 422 for an invalid building id
requires an access token
supports follow, unfollow, and follow again
```

Automated coverage:

```txt
test/building-follow.write.integration.test.js
```
