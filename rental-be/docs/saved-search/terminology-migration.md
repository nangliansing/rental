# SavedSearch terminology migration

## Canonical contract

- Domain and Mongoose model: `SavedSearch`
- API base path: `/api/v1/saved-searches`
- Error-code prefix: `SAVED_SEARCH_`
- MongoDB collection: `client_requests` (intentionally unchanged)

Keeping the existing collection name makes this a code and API migration rather
than a production data migration. Existing documents and indexes remain in place.

## Compatibility window

`/api/v1/client-requests` temporarily routes to the same handlers and data as the
canonical endpoint. Responses from the legacy path include `Deprecation`,
`Sunset`, and successor `Link` headers. The alias is scheduled for removal after
December 31, 2026, once access logs confirm that no supported client uses it.

## Deployment order

1. Deploy the backend with both endpoint paths.
2. Verify the canonical endpoint and legacy alias in production.
3. Deploy the frontend, which uses only `/api/v1/saved-searches`.
4. Monitor legacy-path traffic until the compatibility window ends.
5. Remove the alias in a separately reviewed change after the sunset date.

Rollback is safe during the compatibility window because the MongoDB collection
and stored document shape are unchanged.
