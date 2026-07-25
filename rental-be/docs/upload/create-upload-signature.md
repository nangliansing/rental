# Create Upload Signature

Create signed Cloudinary upload parameters for the authenticated user.

This endpoint does not upload files. It only returns short-lived signed fields that the frontend can use for direct image uploads to Cloudinary.

## Endpoint

```http
POST /api/v1/uploads/signature
```

Local:

```http
POST http://localhost:3000/api/v1/uploads/signature
```

## Auth

Required.

```http
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

Middleware:

```txt
authenticate
requireActiveUser
```

The token user must still exist and have `status: "ACTIVE"`.

## Request Body

```json
{
  "purpose": "listing-photo",
  "count": 2
}
```

Fields:

```txt
purpose  required string
count    optional integer
```

`count` defaults to `1` when omitted.

## Valid Purposes

```txt
agent-profile-photo  max count 1   folder agent-profiles/{userId}
listing-photo        max count 20  folder listings/{userId}
```

Examples:

```json
{
  "purpose": "agent-profile-photo"
}
```

```json
{
  "purpose": "listing-photo",
  "count": 3
}
```

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
    "uploadSignature": {
      "purpose": "listing-photo",
      "uploadSignatures": [
        {
          "cloudName": "dqvlwcgxx",
          "apiKey": "792892712794792",
          "timestamp": 1784506172,
          "folder": "listings/6a5638bafc6d6328c9e1b281",
          "publicId": "341407b5-d994-4715-849d-f97242ae4525",
          "signature": "f03f67a1d016104b81045ffbf312349f8e9fb566"
        }
      ]
    }
  }
}
```

Multiple signatures:

```json
{
  "success": true,
  "data": {
    "uploadSignature": {
      "purpose": "listing-photo",
      "uploadSignatures": [
        {
          "cloudName": "dqvlwcgxx",
          "apiKey": "792892712794792",
          "timestamp": 1784505424,
          "folder": "listings/6a5638bafc6d6328c9e1b281",
          "publicId": "142a2ff5-6536-4465-b892-69f5d6d2db42",
          "signature": "073f813a94a7f8ee2bc88782064bb6f7027e42c4"
        },
        {
          "cloudName": "dqvlwcgxx",
          "apiKey": "792892712794792",
          "timestamp": 1784505424,
          "folder": "listings/6a5638bafc6d6328c9e1b281",
          "publicId": "4f543132-f07e-487f-8f65-c18a517e9aa9",
          "signature": "6ad6af06b26b12d5edee3e81b62da592477f60bd"
        }
      ]
    }
  }
}
```

Agent profile photo:

```json
{
  "success": true,
  "data": {
    "uploadSignature": {
      "purpose": "agent-profile-photo",
      "uploadSignatures": [
        {
          "cloudName": "dqvlwcgxx",
          "apiKey": "792892712794792",
          "timestamp": 1784505478,
          "folder": "agent-profiles/6a5638bafc6d6328c9e1b281",
          "publicId": "615d502f-8bc0-4bff-977f-de64c5c258d0",
          "signature": "bf85e962508df52f1fcf6a86854d9892df486a75"
        }
      ]
    }
  }
}
```

## Response Notes

- `apiSecret` is never returned.
- Each requested signature gets a unique `publicId`.
- The folder is scoped to the authenticated user id.
- The endpoint signs only image upload parameters.
- The frontend uploads the actual file directly to Cloudinary.

## Direct Cloudinary Upload

Use the returned fields to upload the image directly to Cloudinary.

```http
POST https://api.cloudinary.com/v1_1/{cloudName}/image/upload
```

Body type:

```txt
multipart/form-data
```

Fields:

```txt
file       image file
api_key    apiKey
timestamp  timestamp
folder     folder
public_id  publicId
signature  signature
```

Cloudinary returns fields such as:

```json
{
  "secure_url": "https://res.cloudinary.com/dqvlwcgxx/image/upload/...",
  "public_id": "listings/USER_ID/PUBLIC_ID",
  "resource_type": "image",
  "format": "jpg",
  "width": 800,
  "height": 600,
  "bytes": 120000
}
```

Application records should store the normalized media reference needed by the app, not the upload signature.

## Backend Flow

1. Authenticate the access token.
2. Require the token user to exist and be active.
3. Validate `body` is an object.
4. Validate and trim `purpose`.
5. Resolve purpose config.
6. Validate `count`, defaulting to `1`.
7. Check Cloudinary environment config.
8. Generate `count` signatures.
9. Return `data.uploadSignature`.

## Error Cases

Missing access token:

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

Invalid or expired access token:

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

Suspended user:

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

Inactive user:

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

Deleted or missing token user:

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

Invalid JSON:

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

Missing purpose:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "purpose must be a string"
}
```

Blank purpose:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "purpose is required"
}
```

Non-string purpose:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "purpose must be a string"
}
```

Invalid purpose:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid upload purpose"
}
```

Non-number count:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "count must be a number"
}
```

Non-integer count:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "count must be an integer"
}
```

Listing photo count out of range:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "count must be between 1 and 20"
}
```

Agent profile photo count out of range:

```http
422 Unprocessable Entity
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "count must be between 1 and 1"
}
```

Cloudinary config missing:

```http
500 Internal Server Error
```

```json
{
  "success": false,
  "code": "CLOUDINARY_CONFIG_MISSING",
  "message": "Cloudinary config is missing"
}
```

## Tested Checklist

Backend scenario checklist:

```txt
listing-photo default count returns one user-scoped signature
listing-photo count two returns unique public IDs
agent-profile-photo count one returns profile folder
invalid userId rejected
null body rejected
array body rejected
missing purpose rejected
blank purpose rejected
non-string purpose rejected
invalid purpose rejected
null count rejected
string count rejected
decimal count rejected
zero count rejected
listing-photo count above max rejected
agent-profile-photo count above max rejected
missing Cloudinary config rejected after valid input
auth stack accepts active user
missing authorization rejected
empty bearer token rejected
invalid access token rejected
suspended user rejected
inactive user rejected
deleted or missing token user rejected
```

Postman checklist:

```txt
login active user
listing-photo success with count 2
agent-profile-photo success
listing-photo default count success
invalid purpose
missing purpose
blank purpose
non-string purpose
count as string
decimal count
count too low
listing-photo count too high
agent-profile-photo count too high
body is array
body is null
invalid JSON
missing authorization
malformed authorization header
invalid access token
suspended user
inactive user
missing token user
restored user login
final success with fresh token
```

## Source Files

```txt
modules/upload/upload.routes.js
modules/upload/controllers/create-upload-signature.controller.js
modules/upload/services/create-upload-signature.service.js
shared/middlewares/authenticate.js
shared/middlewares/require-active-user.js
shared/validators/object.validators.js
shared/validators/number.validators.js
shared/validators/string.validators.js
```
