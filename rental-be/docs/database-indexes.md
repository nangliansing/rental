# Database Index Operations

MongoDB indexes are declared next to their Mongoose schemas. Production
application startup uses `autoIndex: false`; index changes must be applied as
an explicit deployment operation. Development keeps automatic index creation
for fast feedback.

New index changes should normally be delivered through the versioned workflow
in `docs/database-migrations.md`. The standalone index commands remain useful
for auditing, explain checks, and reconciling an existing environment.

## Commands

Audit the configured database without changing it:

```bash
npm run db:indexes:audit
```

The command exits nonzero when a declared index is missing. Existing indexes
that are not declared by the current schemas are reported as `unmanaged`, but
are not dropped.

Create declared indexes that are missing:

```bash
npm run db:indexes:create
```

This operation creates indexes only. It deliberately does not call
`syncIndexes()` or drop existing indexes. On a large production collection,
run it in a controlled deployment window and monitor replication lag, CPU,
disk usage, and available disk space.

Inspect representative query plans:

```bash
npm run db:indexes:explain
```

The command uses explicit hints for the audited query shapes and reports keys
examined, documents examined, execution stages, and whether MongoDB required a
blocking `SORT`. It exits nonzero if a representative plan contains a blocking
sort. Small development datasets are useful for structural plan checks but not
for predicting production selectivity or latency.

## Deployment Flow

1. Take or verify a recent backup.
2. Run `db:indexes:audit` against the target environment.
3. Review the missing-index list and anticipated storage cost.
4. Run `db:indexes:create` once during the deployment window.
5. Run `db:indexes:audit` again; it should report zero missing indexes.
6. Run `db:indexes:explain` and inspect application latency and database load.

Never run index creation concurrently from every application replica.

## Removing Indexes

Do not remove an `unmanaged` index solely because the auditor reports it.
Capture production `$indexStats` across a representative traffic window,
confirm that no supported query or operational task uses the index, and remove
it through a separately reviewed migration. Keep rollback instructions and the
original index specification with that migration.

The current audit intentionally retains legacy compact listing indexes and a
legacy report-status index until production usage data confirms that the newer
sort-covering indexes fully replace them.

## Search Indexes

The agent autocomplete endpoint uses the MongoDB Atlas Search index
`agent_profile_display_name_autocomplete`. Atlas Search indexes are managed
separately from standard collection indexes and are not visible to this
auditor. Export that search-index definition into deployment configuration and
verify it independently before enabling agent search in a new environment.
