# Database Migrations

Database changes are forward-only JavaScript files in `scripts/migrations`.
The API never runs migrations during startup. A single deployment job runs
them before application replicas that depend on the new schema are released.

## Commands

Create a migration scaffold:

```bash
npm run db:migrate:create -- add-example-field
```

Inspect migration state without applying changes:

```bash
npm run db:migrate:status
```

Apply pending migrations:

```bash
npm run db:migrate
```

All commands use `MONGODB_URI` from the environment. Run them with the same
secret-management mechanism as the application, never with a URI committed to
source control.

## History And Checksums

Attempts are recorded in `database_migrations`. Each record contains the
migration ID, SHA-256 checksum, description, status, attempt count, timing,
and timestamps.

| Status | Meaning |
| --- | --- |
| `PENDING` | Local file has not run |
| `RUNNING` | An attempt started but did not reach a terminal record |
| `APPLIED` | Migration completed successfully |
| `FAILED` | Migration threw an error |
| `CHECKSUM_MISMATCH` | An applied migration file was modified |
| `MISSING_FILE` | Database history refers to a missing file |

Applied files are immutable. A checksum mismatch blocks execution. Never edit,
rename, reorder, or delete an applied migration.

## Distributed Lock

`db:migrate` acquires a renewable lease in `database_migration_locks`. A second
runner fails while the lease is active. The lease is released after success or
handled failure and can be reclaimed after expiration if a process crashes.
Run migrations from one deployment job, never from every application replica.

## Safe Migrations

Every file exports `id`, `description`, and `up({ db, migrationId })`.
Migrations must be:

- forward-only and safe to retry after partial execution;
- compatible with old and new application versions during rolling deployment;
- bounded, observable, and tested against production-like volume;
- free of credentials or personal data in errors; and
- explicit about collection and index names needed by that historical change.

Prefer atomic updates, update pipelines, and idempotent upserts. Process large
backfills in deterministic batches with resumable checkpoints. MongoDB cannot
place every DDL operation and long backfill inside one universal transaction.

## Deployment Flow

Use an expand-and-contract sequence:

1. Verify a recent backup and successful restore drill.
2. Run `npm run db:migrate:status`; stop on unsafe states.
3. Deploy backward-compatible code when required.
4. Run `npm run db:migrate` from one deployment job.
5. Require every local migration to report `APPLIED`.
6. Run index audit and explain checks when indexes changed.
7. Deploy code that relies on the expanded schema.
8. Remove old fields or indexes only in a later release.

## Failure Recovery

A failed migration is recorded as `FAILED`, never `APPLIED`. Inspect the
database before retrying because part of `up()` may have completed. Make the
failed migration idempotent, test the correction, and rerun it. Its checksum
may change until it first reaches `APPLIED`.

Do not manually mark history as applied and do not use generic automatic
rollback. Destructive reversal can lose newer writes. Roll back application
code only while it remains schema-compatible, then use a reviewed compensating
migration or restore procedure when the data itself must be reversed.
