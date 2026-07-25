# Dormant Authentication Endpoints

## V1 Decision

V1 supports Google authentication only. The following password endpoints are
not registered and return the standard `404 NOT_FOUND` response:

```http
POST /api/v1/users/signup/password
POST /api/v1/users/login/password
```

Their controllers, services, validators, models, and focused documentation are
retained for a possible V2 password-auth release. Retained code is not an
active API contract.

## Active V1 Authentication Surface

```http
POST /api/v1/users/login/google
POST /api/v1/users/token/refresh
POST /api/v1/users/logout
GET  /api/v1/users/me
```

## Reactivation Checklist

Before registering either password endpoint:

1. Complete email ownership verification.
2. Implement forgot-password and single-use reset-token flows.
3. Add delivery-provider failure handling and abuse limits.
4. Define account-linking behavior for existing Google identities.
5. Review password policy, session revocation, and credential storage.
6. Add complete endpoint, concurrency, and security tests.
7. Restore the intended frontend flow and validate accessibility.
8. Update the endpoint document and remove its dormant banner.

Password routes must not be re-enabled individually if that would leave the
account lifecycle incomplete.
