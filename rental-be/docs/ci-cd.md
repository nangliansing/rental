# CI/CD deployment gates

## Continuous integration

The repository includes a read-only GitHub Actions workflow at
`.github/workflows/backend-ci.yml`. It runs for pushes, pull requests, and
manual dispatches without database credentials or deployment permissions.

The `Validate backend` job:

1. checks out source without persisting GitHub credentials
2. installs the pinned Node.js version from `.nvmrc`
3. installs exactly `package-lock.json` with `npm ci`
4. validates runtime, lockfile, migration, and index contracts
5. rejects high or critical vulnerabilities in production dependencies
6. builds the production container artifact
7. runs the complete test suite serially

Official actions are pinned to immutable commit SHAs. Dependabot or an
equivalent reviewed update process should keep those pins current.

Run the deterministic portion locally:

```sh
npm ci
npm run ci:validate
```

Run the registry-backed audit separately:

```sh
npm run ci:audit
```

## Repository protection

After publishing the repository to GitHub, protect the release branch:

- require pull requests and at least one approving reviewer
- require the `Backend CI / Validate backend` status check
- require the branch to be current before merging
- dismiss approvals when protected files change
- block force pushes and branch deletion
- restrict direct pushes and administrative bypasses
- enable secret scanning and dependency update alerts

Treat changes under `scripts/migrations`, database models, authentication,
runtime configuration, `.github/workflows`, and lockfiles as protected review
areas. Add `CODEOWNERS` only after real maintainers and teams are known; a
placeholder owner would provide false assurance.

## Deployment gate order

CI proves source integrity but does not authorize production changes. A future
deployment workflow must use an environment protected by explicit approval and
must allow only one production deployment at a time.

Required order:

1. require the exact commit's CI check to pass
2. verify a recent encrypted backup and successful restore drill
3. confirm production configuration and dependency readiness
4. run `npm run db:migrate:status` from one deployment job
5. stop on `FAILED`, `RUNNING`, `CHECKSUM_MISMATCH`, or `MISSING_FILE`
6. run `npm run db:migrate` once, never from every application replica
7. run `npm run db:indexes:audit` and apply reviewed index changes when needed
8. deploy backward-compatible application replicas
9. wait for `/health/ready` before routing traffic
10. run smoke tests and monitor errors, latency, saturation, and dependencies

Deployment credentials must come from the hosting platform's protected secret
store. Pull-request workflows must never receive production secrets.

## Rollback contract

Application rollback and database recovery are separate decisions:

- roll application code back only while it remains compatible with the current
  database schema
- never automatically reverse an applied migration
- use a reviewed forward-fix or compensating migration for data changes
- use point-in-time recovery only for an incident requiring database recovery
- record the release, migration state, backup identifier, timestamps, operator,
  reason, and verification result

Do not add a deployment workflow until the hosting provider, artifact format,
release branch, readiness integration, and production approval owner are known.

The portable artifact and runtime controls are documented in
`docs/container-deployment.md`.
