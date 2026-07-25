# Login With Google

## Endpoint

```http
POST /api/v1/users/login/google
```

Full local URL:

```http
POST http://localhost:3000/api/v1/users/login/google
```

This is the only account-creation and login method exposed in V1.

## Required Configuration

The backend must receive one or more comma-separated Google OAuth web client
IDs:

```env
GOOGLE_CLIENT_IDS=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

The frontend uses the corresponding public client ID. A client secret is not
sent by the browser and is not required for this Google Identity Services ID
token flow.

## Headers

```http
Content-Type: application/json
Origin: http://localhost:5173
```

`Origin` is required and must exactly match an entry in `CORS_ORIGINS`. Requests
without a trusted origin are rejected before Google credential processing.

## Request Body

```json
{
  "credential": "GOOGLE_ID_TOKEN"
}
```

The credential is the ID token returned to the browser by Google Identity
Services. Do not send a Google access token, authorization code, client secret,
local role, or account status.

Validation rules:

- `body` must be a JSON object.
- `credential` is required and must be a non-blank string.
- `credential` may contain at most 10,000 characters.
- Unknown fields are rejected.

## Success Response

Status:

```http
200 OK
```

New account example:

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "USER_ID",
      "name": "Google User",
      "email": "google.user@example.com",
      "authProvider": "GOOGLE",
      "role": "USER",
      "status": "ACTIVE",
      "createdAt": "2026-07-21T00:00:00.000Z",
      "updatedAt": "2026-07-21T00:00:00.000Z"
    },
    "accessToken": "ACCESS_TOKEN",
    "isNewUser": true
  }
}
```

Returning accounts receive the same shape with `isNewUser: false`.

The response never includes a password or refresh token. The access token is
returned to the frontend and kept in memory.

## Refresh Token Cookie

A successful response sets `refreshToken` as an HTTP-only cookie:

```txt
Set-Cookie: refreshToken=TOKEN; Path=/; HttpOnly; SameSite=Strict
```

Cookie behavior:

- lifetime is three days;
- `HttpOnly` prevents browser JavaScript from reading it;
- `SameSite` comes from `COOKIE_SAME_SITE`;
- `Secure` is enabled in production;
- `Domain` is included only when `COOKIE_DOMAIN` is configured; and
- the frontend must send subsequent requests with credentials enabled.

Use `POST /api/v1/users/token/refresh` to obtain a new access token and
`POST /api/v1/users/logout` to expire this cookie.

## Authentication Flow

1. Validate the request and trusted browser origin.
2. Verify the Google ID token against every configured Google client ID.
3. Require a non-empty Google subject, email, and `email_verified: true`.
4. Find an identity by `{ provider: "GOOGLE", providerSubject: sub }`.
5. For a returning identity, load and require its current local user to be
   active, update identity authentication metadata, and issue local tokens.
6. For a first login, create the user, Google identity, and welcome
   notification in one MongoDB transaction.
7. Resolve concurrent first-login races through the unique provider-subject
   index so requests converge on one account.
8. Emit the committed welcome notification and return the local session.

Google's stable `sub` claim is the identity key. Email alone is never used to
silently link an account.

## New Account Behavior

The backend creates:

- a `USER` account with `ACTIVE` status and `GOOGLE` auth provider;
- an auth identity containing the Google subject and verified provider email;
- no password or password hash; and
- one welcome notification linked to `/profile`.

Welcome notification:

```json
{
  "type": "WELCOME",
  "title": "Welcome",
  "message": "Welcome! Complete your profile to add your contact details and start listing rooms.",
  "link": "/profile"
}
```

The Google display name is used when present. If it is absent, a bounded name
is derived from the email prefix.

## Returning Account Behavior

The auth identity's provider email, verification state, and
`lastAuthenticatedAt` are refreshed. The local user's name and email are not
silently overwritten by changed Google claims. A returning login does not
create another user, identity, or welcome notification.

## Error Responses

### Untrusted Or Missing Origin

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

### Invalid Request

```http
422 Unprocessable Entity
```

Examples include:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "credential is required"
}
```

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Unknown fields: role"
}
```

### Invalid Google Credential

Expired, malformed, wrong-audience, incomplete, or unverified-email Google ID
tokens receive the same non-sensitive response:

```http
401 Unauthorized
```

```json
{
  "success": false,
  "code": "INVALID_GOOGLE_CREDENTIAL",
  "message": "Google sign-in could not be verified"
}
```

### Existing Email Requires Linking

If the verified Google email already belongs to a local account without this
Google identity, the backend does not link it automatically:

```http
409 Conflict
```

```json
{
  "success": false,
  "code": "ACCOUNT_LINK_REQUIRED",
  "message": "An account already exists with this email"
}
```

### Suspended Account

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

### Inactive Account

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

### Identity Without A Local Account

```http
401 Unauthorized
```

```json
{
  "success": false,
  "code": "ACCOUNT_UNAVAILABLE",
  "message": "Account is unavailable"
}
```

### Malformed JSON

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

### Rate Limit

```http
429 Too Many Requests
```

```json
{
  "success": false,
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please try again later."
}
```

## Postman Notes

Postman cannot create a genuine Google ID token from an email and password.
Obtain the credential through the configured frontend Google button or another
Google-supported OAuth test flow, then send it promptly because ID tokens
expire. Include the configured frontend `Origin` header and allow Postman to
retain the response cookie.

Never commit a real ID token, refresh cookie, JWT, client secret, or production
credential to documentation or source control.

## Tested Checklist

- Trusted-origin enforcement and configured-origin CORS preflight.
- Object-body, required credential, type, blank, maximum-length, unknown-field,
  and malformed-JSON validation.
- Invalid and unverifiable Google credentials mapped to one stable error.
- Required Google subject, email, verified-email flag, and accepted audience.
- New user, Google identity, welcome notification, access token, and refresh
  token creation.
- Default `USER` role, `ACTIVE` status, `GOOGLE` provider, and null password.
- Access and refresh token subjects and refresh-token type.
- Returning login without duplicate account or notification creation.
- Updated provider identity metadata without overwriting local profile fields.
- Missing Google display-name fallback.
- Existing-email conflict without unsafe automatic linking.
- Suspended, inactive, and missing-local-user identity handling.
- Transaction rollback when Google verification fails.
- Concurrent first-login requests converging on one account and identity.
- Authentication and global mutation rate limiting.
- Real frontend Google login and subsequent session restoration.

Automated coverage is located in:

- `test/app.integration.test.js`
- `test/google-id-token.test.js`
- `test/google-login.service.test.js`
- `test/security.integration.test.js`
