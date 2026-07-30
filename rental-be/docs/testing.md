# Backend Testing

## Commands

Run the complete test suite once:

```bash
npm test
```

Run tests continuously while developing:

```bash
npm run test:watch
```

The project uses Node's built-in test runner with serial test-file execution.
Serial execution keeps shared Mongoose model state deterministic while the
suite grows.

## Test Database Isolation

Integration tests start a temporary single-node MongoDB replica set through
`mongodb-memory-server-core`. A replica set is required because production
services use MongoDB transactions.

The test suite:

- sets `NODE_ENV=test` before importing the application;
- creates a database named `rental_be_test`;
- refuses to connect if the generated URI does not contain that database name;
- never reads `MONGODB_URI` from `.env`;
- clears all test collections after every test; and
- stops HTTP, Mongoose, and MongoDB resources after the run.

Do not replace the generated test URI with a development, staging, or
production database URI.

## MongoDB Binary

The default test MongoDB version is `7.0.14`, which supports the local macOS
development environment and transaction tests. The first test run downloads
the binary into the `mongodb-memory-server` cache. Later runs reuse it.

CI may override the version:

```bash
MONGOMS_VERSION=7.0.14 npm test
```

CI or a developer with a compatible local `mongod` may avoid downloading:

```bash
MONGOMS_SYSTEM_BINARY=/absolute/path/to/mongod npm test
```

The supplied binary must run on the host operating system and report a valid
MongoDB version.

## Baseline Coverage

`test/app.integration.test.js` currently covers:

- health response;
- liveness and readiness responses;
- standard route-not-found response;
- malformed JSON response;
- missing and invalid admin access tokens;
- current database role enforcement;
- suspended and inactive accounts;
- token subjects whose users no longer exist;
- all documented dormant admin routes returning `404`; and
- the neighboring admin listing-deletion route remaining active; and
- building neighbourhood HTTP success and validation boundaries.

Neighbourhood-specific automated coverage lives in:

```txt
test/neighbourhood.test.js                       # 55 unit tests
test/neighbourhood.integration.test.js           # 13 service + Mongo tests
test/neighbourhood.scenarios.integration.test.js # 21 HTTP scenario tests
```

Run only neighbourhood tests (from the `rental-be` repository root):

```bash
node --test \
  test/neighbourhood.test.js \
  test/neighbourhood.integration.test.js \
  test/neighbourhood.scenarios.integration.test.js
```

See `docs/building/get-building-neighbourhood.md` for the API contract and
test checklist.

Building follow and viewer follow-state coverage lives in:

```txt
test/building-follow.write.integration.test.js   # follow / unfollow mutations
test/building-follow.fetch.integration.test.js   # followers / followings lists
test/building-is-following.integration.test.js   # isFollowing on building reads
test/enrich-listing-building-with-viewer-state.test.js
test/resolve-is-following.test.js                # imperative viewer helper
test/build-is-following-field-stages.test.js     # aggregation helper contract
test/search-buildings-near-lines.integration.test.js
```

Related docs:

```txt
docs/building-follow/create-building-follow.md
docs/building-follow/delete-building-follow.md
docs/building-follow/get-building-followers.md
docs/building-follow/get-user-building-follows.md
docs/building/get-building-by-id.md
docs/search/search-buildings-in-map.md
docs/search/search-buildings-nearby.md
docs/search/search-buildings-near-lines.md
docs/search/search-listings-in-building.md
docs/search/search-listing-by-id.md
docs/listing/owner-search-listing-by-id.md
```

The security and observability suites additionally cover security headers,
request limits, Redis-ready production configuration, lifecycle behavior,
request-ID propagation, structured-log redaction, bounded metric labels, and
authenticated Prometheus scraping. Database tests also enforce schema index
contracts and migration ordering, checksums, locking, idempotent retry, and
failure-state behavior.

`BuildingFollow` schema indexes enforced by the test suite:

```txt
{ userId: 1, buildingId: 1 } unique
{ userId: 1, createdAt: -1, _id: -1 }
{ buildingId: 1, createdAt: -1, _id: -1 }
```

This is the foundation, not complete endpoint coverage. Each endpoint should
add success, validation, authorization, account-state, transaction rollback,
and concurrency tests as appropriate.
