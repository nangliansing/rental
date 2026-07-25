# Unused Admin Endpoint Registry

Last reviewed: 2026-07-20

## Purpose

This document records admin endpoints that exist in the codebase but are not
part of the intended product flow. It preserves enough implementation context
to evaluate and restore them later without treating their current code as
production-ready.

These endpoints are **dormant by product decision**. Their implementation files
are retained, but their public route registrations were disabled on 2026-07-20
to keep them out of the production attack surface.

## Inventory

| Method | Endpoint | Disabled at | Current replacement | Frontend status |
| --- | --- | --- | --- | --- |
| `POST` | `/api/v1/admin/buildings` | Admin building router is not mounted | Customer pending-post flow | No wrapper or UI |
| `PATCH` | `/api/v1/admin/buildings/:buildingId` | Admin building router is not mounted | Building edit-request review flow | No wrapper or UI |
| `POST` | `/api/v1/admin/listings` | Route removed from admin listing router | Customer pending-post flow | No wrapper or UI |
| `PATCH` | `/api/v1/admin/agent-profiles/:agentProfileId` | Admin agent-profile router is not mounted | Future verification-request collection | Wrapper exists; no active UI usage |

The admin listing deletion endpoint is **not** dormant. It remains an active
moderation endpoint:

```http
DELETE /api/v1/admin/listings/:listingId
```

## Shared Access Control

All four routes inherit the middleware registered in
`routes/admin.routes.js`:

1. `authenticate`
2. `requireActiveUser`
3. `authorizeRoles(OWNER, ADMIN)`

Expected authentication failures are:

| Status | Code | Meaning |
| --- | --- | --- |
| `401` | `ACCESS_TOKEN_REQUIRED` | Bearer access token is missing or empty |
| `401` | `INVALID_ACCESS_TOKEN` | Token is invalid or expired |
| `403` | `ACCOUNT_SUSPENDED` | Current database user is suspended |
| `403` | `ACCOUNT_INACTIVE` | Current database user is inactive |
| `403` | `FORBIDDEN` | Current user is not an `OWNER` or `ADMIN` |
| `404` | `USER_NOT_FOUND` | Token subject no longer exists |

The role check uses the current database user loaded by `requireActiveUser`, so
an old token does not preserve a role that was removed later.

## 1. Direct Building Creation

### Endpoint

```http
POST /api/v1/admin/buildings
```

### Why It Is Dormant

Buildings should enter the platform through customer submissions and the
pending-post approval workflow. Direct admin creation bypasses the customer
submission record and its review history.

Current preferred flow:

```text
POST /api/v1/pending-posts
  -> GET /api/v1/admin/pending-posts
  -> PATCH /api/v1/admin/pending-posts/:pendingPostId/approve
```

### Current Contract

The request body contains:

```json
{
  "name": "The Park Residence",
  "buildingType": "Apartment",
  "facilities": ["Parking", "Lift", "Wifi"],
  "security": ["CCTV", "Security Guard", "Keycard Access"],
  "location": {
    "type": "Point",
    "coordinates": [100.6432, 13.7651]
  },
  "address": "Near The Mall Bangkapi, Bangkok"
}
```

The service forces these server-controlled values:

- `isActive: true`
- `minRent: null`
- `maxRent: null`
- `createdBy: <admin actor id>`
- `updatedBy: null`

Success is `201 Created`:

```json
{
  "success": true,
  "data": {
    "_id": "BUILDING_ID",
    "name": "The Park Residence",
    "isActive": true,
    "minRent": null,
    "maxRent": null,
    "createdBy": "ADMIN_USER_ID",
    "updatedBy": null
  }
}
```

### Implementation Map

- Route: `modules/building/admin-building.routes.js`
- Controller: `modules/building/controllers/admin-create-building.controller.js`
- Service: `modules/building/services/admin-create-building.service.js`
- Mapper: `modules/building/mappers/build-create-building-record.js`
- Validation: `modules/building/building.validation.js`
- Model: `modules/building/building.model.js`
- Existing detailed reference: `docs/building/admin-create-building.md`

### Known Work Before Restoration

- Use `req.currentUser._id` instead of the legacy `req.user.id` value.
- Pass `req.dbSession ?? null` from the controller when transaction middleware
  supplies a session.
- Decide whether names/locations need duplicate-building detection.
- Reject unknown request fields instead of silently ignoring them.
- Confirm whether a directly created building requires an audit record.
- Add a strict frontend wrapper and response parser.
- Test all validation, auth, account-state, duplicate, and transaction cases.

## 2. Direct Building Update

### Endpoint

```http
PATCH /api/v1/admin/buildings/:buildingId
```

### Why It Is Dormant

Customer-proposed building changes should retain an original snapshot, a
proposed snapshot, reviewer identity, decision, and reason. The building edit
request flow already supplies that audit trail.

Current preferred flow:

```text
POST /api/v1/building-edit-requests
  -> GET /api/v1/admin/building-edit-requests
  -> GET /api/v1/admin/building-edit-requests/:buildingEditRequestId
  -> PATCH /api/v1/admin/building-edit-requests/:buildingEditRequestId/approve
     or
     PATCH /api/v1/admin/building-edit-requests/:buildingEditRequestId/reject
```

### Current Contract

`buildingId` must be a valid MongoDB id. The body may update:

- `name`
- `isActive`
- `buildingType`
- `facilities`
- `security`
- `location`
- `address`

An admin `reason` is required even though it is not persisted in a dedicated
building audit record:

```json
{
  "name": "Bangkapi Residence",
  "isActive": true,
  "facilities": ["Parking", "Wifi"],
  "reason": "Corrected after verification"
}
```

Success is `200 OK` with the updated building in `data`. A missing building
returns `404 BUILDING_NOT_FOUND`.

### Implementation Map

- Route: `modules/building/admin-building.routes.js`
- Controller: `modules/building/controllers/admin-update-building.controller.js`
- Service: `modules/building/services/admin-update-building.service.js`
- Mapper: `modules/building/mappers/build-update-building-record.js`
- Validation: `modules/building/building.validation.js`
- Model: `modules/building/building.model.js`
- Existing detailed reference: `docs/building/admin-update-building.md`

### Known Work Before Restoration

- Use `req.currentUser._id` and propagate `req.dbSession`.
- Add strict body validation and reject unknown fields.
- Persist the required reason in a durable moderation/audit record.
- Define notification behavior for affected listing owners.
- Define what deactivating a building does to public listings and saved items.
- Use an atomic eligibility filter if updates gain state restrictions.
- Add a dedicated frontend wrapper and strict response parser.
- Test no-op updates, reason boundaries, missing/deactivated buildings,
  concurrent updates, auth, and account states.

## 3. Direct Listing Creation

### Endpoint

```http
POST /api/v1/admin/listings
```

### Why It Is Dormant

Listings should be submitted by customers with agent profiles and reviewed as
pending posts. Direct admin creation makes the admin the `listedBy` owner and
bypasses submission review.

Current preferred flow:

```text
POST /api/v1/pending-posts
  -> GET /api/v1/admin/pending-posts
  -> PATCH /api/v1/admin/pending-posts/:pendingPostId/approve
```

### Current Behavior

The request uses the standard listing details plus `buildingId`. The service:

1. Builds the listing with `listedBy` set to the admin actor.
2. Requires the building to exist.
3. Rejects an inactive building with `BUILDING_INACTIVE`.
4. Creates the listing.
5. Recalculates the building rent summary.

Success is `201 Created` with the created listing in `data`.

### Implementation Map

- Route: `modules/listing/admin-listing.routes.js`
- Controller: `modules/listing/controllers/admin-create-listing.controller.js`
- Service: `modules/listing/services/admin-create-listing.service.js`
- Mapper: `modules/listing/mappers/build-create-listing-record.js`
- Validation: `modules/listing/listing.validation.js`
- Model: `modules/listing/listing.model.js`
- Rent summary: `modules/building/services/update-building-rent-summary.service.js`
- Existing detailed reference: `docs/listing/admin-create-listing.md`

### Known Work Before Restoration

- Decide who should own an admin-created listing. The current implementation
  assigns `listedBy` to the admin, which is usually not the desired domain
  ownership.
- If admins create on behalf of customers, accept and validate a target owner
  separately and verify that owner has an eligible agent profile.
- Use `req.currentUser._id` and propagate `req.dbSession`.
- Wrap listing creation and rent-summary recalculation in one transaction.
- Reject unknown fields and prevent clients from controlling ownership or
  deletion metadata.
- Define upload ownership and Cloudinary asset validation.
- Add a dedicated frontend wrapper and strict response parser.
- Test rollback when rent-summary recalculation fails.

## 4. Direct Agent Verification Update

### Endpoint

```http
PATCH /api/v1/admin/agent-profiles/:agentProfileId
```

### Why It Is Dormant

Verification will use its own request/evidence collection and a review flow,
similar to suspensions. The direct boolean mutation does not preserve a full
verification application, evidence, decision history, or lifecycle.

Planned replacement shape:

```text
Customer submits verification request and evidence
  -> Admin lists and opens the request
  -> Admin approves or rejects it with a reason
  -> Agent profile verification fields are synchronized
  -> Customer receives a concise notification
```

### Current Contract

Verify:

```json
{
  "isVerified": true,
  "reason": "Verified identity and contact details."
}
```

Unverify:

```json
{
  "isVerified": false,
  "reason": "Verification removed after review."
}
```

The current implementation already:

- validates the profile, actor, and profile owner;
- rejects deleted or missing profiles;
- rejects a no-op verification change;
- updates `isVerified`, `verifiedBy`, and `verifiedAt` in a transaction;
- creates the owner notification in the same transaction; and
- emits the socket notification after commit.

### Implementation Map

- Route: `modules/agent/admin-agent-profile.routes.js`
- Controller: `modules/agent/controllers/admin-update-agent-profile.controller.js`
- Service: `modules/agent/services/admin-update-agent-profile.service.js`
- Mapper: `modules/agent/mappers/build-admin-update-agent-profile-record.js`
- Validation: `modules/agent/agent-profile.validation.js`
- Model: `modules/agent/agent-profile.model.js`
- Frontend wrapper:
  `rental-fe/src/features/admin/api/updateAdminAgentProfileVerification.ts`
- Existing detailed reference:
  `docs/agent-profile/admin-update-agent-profile.md`

### Known Work Before Restoration

- Prefer implementing the verification-request collection instead of restoring
  this direct endpoint unchanged.
- Define request statuses, evidence retention, resubmission, expiry, revocation,
  and reviewer permissions.
- Keep approval and profile synchronization in one transaction.
- Make notification text concise and avoid exposing sensitive evidence.
- Reassess whether both `OWNER` and `ADMIN` may approve verification.
- Revalidate or replace the existing frontend wrapper against the new response
  contract.

## Frontend Inventory

No frontend wrappers currently exist for:

- `POST /api/v1/admin/buildings`
- `PATCH /api/v1/admin/buildings/:buildingId`
- `POST /api/v1/admin/listings`

The frontend contains
`src/features/admin/api/updateAdminAgentProfileVerification.ts`, but no active
page or component calls it. Do not treat an exported wrapper as an active
product flow.

## Restoration Checklist

Use this checklist before restoring any dormant endpoint:

- Confirm the endpoint still represents the desired product workflow.
- Confirm whether the route should be `OWNER`-only or allow `ADMIN`.
- Use `req.currentUser` as the source of actor identity and current role.
- Reuse `authenticate`, `requireActiveUser`, and the shared admin role gate.
- Validate path parameters, body shape, allowed fields, and string boundaries.
- Reject protected and unknown fields explicitly.
- Define idempotency and no-op behavior.
- Use an atomic state transition where eligibility matters.
- Use a transaction for multi-document writes.
- Persist audit reasons rather than accepting and discarding them.
- Create notifications inside the transaction and emit only after commit.
- Keep notification titles and messages short and user-friendly.
- Return `{ "success": true, "data": ... }` consistently.
- Add stable error codes for every expected failure.
- Add or confirm indexes from actual query shapes.
- Add backend integration tests, including rollback and concurrency cases.
- Add a typed frontend wrapper with encoded ids and strict response parsing.
- Map expected backend errors to simple UI messages.
- Update the endpoint-specific document and remove its dormant banner.
- Run the full backend test suite and frontend typecheck, lint, and build.

## Disabling And Restoring Routes

The admin building and agent-profile module routers are retained but are not
mounted by `routes/admin.routes.js`. The direct listing-creation route is
removed from `modules/listing/admin-listing.routes.js`, while admin listing
deletion remains active. Controllers, services, mappers, and documents are
retained.

To restore one later:

1. Complete its endpoint-specific restoration checklist.
2. For building or agent verification, import and mount the retained module
   router in `routes/admin.routes.js`.
3. For direct listing creation, restore the controller import and
   `router.post("/", adminCreateListingController)` in
   `modules/listing/admin-listing.routes.js`.
4. Add the frontend wrapper and UI only if the product flow needs them.
5. Run automated and Postman scenarios before exposing it.
