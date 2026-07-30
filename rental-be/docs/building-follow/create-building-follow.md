# Create Building Follow

Follow an active building for the authenticated user.

This endpoint is user-scoped. The caller cannot follow on behalf of another user.

## Endpoint

```http
POST /api/v1/building-follows/:buildingId
```

Full local URL:

```http
POST http://localhost:3000/api/v1/building-follows/6a57c6da947d934e03495b7a
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

Do not send:

```txt
userId
buildingFollowId
```

The backend derives `userId` from the authenticated user.

## Business Rules

The building must:

- exist
- have `isActive: true`

A user may follow the same building only once.

Different users may follow the same building.

The same user may follow different buildings.

## Success Response

Status:

```http
201 Created
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

## Error Cases

### Already Followed

Status:

```http
409 Conflict
```

```json
{
  "success": false,
  "code": "BUILDING_ALREADY_FOLLOWED",
  "message": "Building is already followed"
}
```

### Building Not Found

Status:

```http
404 Not Found
```

```json
{
  "success": false,
  "code": "BUILDING_NOT_FOUND",
  "message": "Building not found"
}
```

This also applies when the building exists but is inactive.

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

## Implementation Notes

The service validates the building through the shared active-building lookup before creating the follow record.

Duplicate follow attempts are rejected with `409` using both a pre-check and a unique-index race guard on `{ userId, buildingId }`.

## Tested Checklist

```txt
creates a follow for an active building
allows different users to follow the same building
allows the same user to follow different buildings
handles concurrent follow requests for the same building
returns 409 when the building is already followed
returns 404 when the building does not exist
returns 404 when the building is inactive
returns 422 for an invalid building id
requires an access token
rejects an invalid access token
rejects a suspended user
rejects an inactive user
rejects a token whose user no longer exists
```

Automated coverage:

```txt
test/building-follow.write.integration.test.js
```
