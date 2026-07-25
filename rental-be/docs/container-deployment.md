# Production container

## Image contract

`Dockerfile` builds one portable production artifact with:

- Node.js 22.17.0 on Debian Bookworm slim, pinned by multi-platform digest
- deterministic dependencies from `package-lock.json`
- development dependencies omitted from the runtime image
- an unprivileged `node` user
- exec-form startup and `SIGTERM` shutdown
- an internal liveness health check at `/health/live`
- no source-controlled configuration or persistent application data

The image includes database migration and index scripts so the same immutable
artifact can be used by a one-off deployment job. It excludes tests, local
backups, documentation, Git metadata, dependencies, temporary files, and every
`.env` variant from the build context.

## Build

Use a release identifier supplied by CI:

```sh
docker build \
  --pull \
  --build-arg BUILD_REVISION=<commit-sha> \
  --tag rental-be:<release-id> \
  .
```

Never use `latest` as the only production identifier. Publish by immutable image
digest and retain the release-to-digest mapping for rollback.

Add an `org.opencontainers.image.source` label after the canonical source
repository URL is known; do not publish placeholder provenance metadata.

## Run securely

Supply secrets from the platform's secret manager. For a local container smoke
test, use an external production-format environment file that is not committed:

```sh
docker run --rm \
  --name rental-be \
  --init \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  --cap-drop=ALL \
  --security-opt=no-new-privileges \
  --env-file /secure/path/rental-be.env \
  --publish 3000:3000 \
  rental-be:<release-id>
```

MongoDB and Redis URLs must be reachable from inside the container. A URL using
`127.0.0.1` refers to the container itself, not the host.

## Probes and shutdown

- Container liveness: `/health/live`
- Load-balancer or orchestrator readiness: `/health/ready`
- Backward-compatible health route: `/health`

Do not use readiness as Docker's restart health check: a temporary MongoDB or
Redis outage should remove the instance from traffic without creating a restart
loop. Configure the platform to stop routing before sending `SIGTERM`, and set
its termination grace period above `SHUTDOWN_TIMEOUT_MS`.

## Deployment jobs

Run migrations and index checks as one-off commands from the exact image digest:

```sh
docker run --rm --env-file /secure/path/rental-be.env <image-digest> \
  npm run db:migrate:status

docker run --rm --env-file /secure/path/rental-be.env <image-digest> \
  npm run db:migrate

docker run --rm --env-file /secure/path/rental-be.env <image-digest> \
  npm run db:indexes:audit
```

Apply stricter network and identity controls to these jobs than application
replicas. Only the migration job should have privileges needed for schema or
index changes.
