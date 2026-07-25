# Production configuration

The API validates its runtime configuration before connecting to MongoDB or
opening a network port. Invalid configuration stops startup and reports every
configuration issue without printing secret values.

Use `.env.example` only as a key and format reference. Store production values
in the deployment platform's secret manager, not in source control or images.

## Required values

| Variable | Requirement |
| --- | --- |
| `NODE_ENV` | `development`, `production`, or `test` |
| `MONGODB_URI` | MongoDB URI using `mongodb://` or `mongodb+srv://` |
| `JWT_ACCESS_SECRET` | Random value with at least 32 characters |
| `JWT_REFRESH_SECRET` | Different random value with at least 32 characters |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

`CORS_ORIGINS` is also required in production. It is a comma-separated list of
exact HTTP or HTTPS origins, for example
`https://app.example.com,https://admin.example.com`. Wildcards, paths, and
trailing slashes are rejected because browser credentials are enabled. The
same allowlist protects HTTP and Socket.IO.

Production also requires `TRUST_PROXY_HOPS`, `RATE_LIMIT_STORE=redis`, and a
`REDIS_URL`. When metrics are enabled, production also requires a random
`METRICS_TOKEN` with at least 32 characters. The explicit proxy hop count ensures client IP addresses are taken
from the expected proxy topology instead of trusting arbitrary forwarded
headers. Redis shares quotas across application instances and restarts.

## Optional values

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `3000` | Integer from 1 through 65535 |
| `JSON_BODY_LIMIT` | `256kb` | JSON request-body limit |
| `SHUTDOWN_TIMEOUT_MS` | `10000` | Graceful-shutdown deadline, 1-60 seconds |
| `TRUST_PROXY_HOPS` | `0` | Required explicitly in production |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Duration such as `15m` or `1h` |
| `COOKIE_SAME_SITE` | `strict` | `strict`, `lax`, or `none` |
| `COOKIE_DOMAIN` | unset | Set only when cookies must span subdomains |
| `RATE_LIMIT_STORE` | `memory` locally | Must be `redis` in production |
| `REDIS_URL` | unset | Required with the Redis rate-limit store |
| `SERVICE_NAME` | `rental-be` | Structured-log service label |
| `LOG_LEVEL` | `info` | `fatal`, `error`, `warn`, `info`, `debug`, `trace`, or `silent` |
| `METRICS_ENABLED` | `true` | Enables the private Prometheus endpoint at `/metrics` |
| `METRICS_TOKEN` | unset locally | Required with enabled production metrics; minimum 32 characters |

Rate-limit maximums can be tuned with the `RATE_LIMIT_*_MAX` values shown in
`.env.example`. Windows and baseline defaults are documented in
`docs/http-security.md`.

Logging, request IDs, metric names, scrape authentication, and initial alert
guidance are documented in `docs/observability.md`.

Production disables Mongoose automatic index creation. Apply and verify schema
indexes as an explicit deployment step using the workflow in
`docs/database-indexes.md`.

Versioned database changes and deployment ordering are documented in
`docs/database-migrations.md`.

Backup retention, portable logical backups, and guarded restore drills are
documented in `docs/database-backups.md`.

Continuous integration, branch protection, deployment ordering, and rollback
gates are documented in `docs/ci-cd.md`.

The production image, container runtime restrictions, and probe configuration
are documented in `docs/container-deployment.md`.

Production refresh cookies are always `Secure` and `HttpOnly`.
`COOKIE_SAME_SITE=none` is accepted only in production, where secure cookies
are enabled. Development defaults `CORS_ORIGINS` to `http://localhost:5173`.

## Secret rotation

Rotate database, JWT, and Cloudinary credentials through the deployment secret
manager. Changing either JWT secret immediately invalidates tokens signed with
the previous value, so plan a user reauthentication window. Never log the
configuration object or secret values.

## Deployment check

Before deployment, run:

```bash
npm test
NODE_ENV=production node index.js
```

The second command should be run with the real deployment environment supplied.
It must reach configuration validation before any network listener starts.
