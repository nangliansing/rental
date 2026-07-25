# Database backups and restore drills

## Production policy

Use the database provider's encrypted continuous backup and point-in-time restore
as the primary production backup. The logical backup commands in this repository
provide an independent portable copy and a repeatable restore test; they do not
replace provider snapshots for a busy production database.

Recommended baseline:

- recovery point objective (RPO): 15 minutes or better
- recovery time objective (RTO): 60 minutes or better
- daily logical backup, retained for 30 days
- monthly backup, retained for 12 months
- encryption at rest and in transit
- backup credentials with read and backup privileges only
- restore credentials scoped to the isolated drill environment
- alerts for failed, missing, late, or unexpectedly small backups
- a successful restore drill at least monthly and before risky migrations

Keep archives outside the application host in encrypted object storage with
versioning, retention controls, and access audit logs. Never commit archives,
manifests, MongoDB URIs, or credentials.

## Prerequisites

Install matching MongoDB Database Tools so `mongodump` and `mongorestore` are
available. The commands pass the MongoDB URI through a private mode-0600 temporary
config file and remove it afterward, avoiding credentials in command arguments.

`MONGODB_URI` must include an explicit database name.

## Create and verify a logical backup

```sh
npm run db:backup
```

Backups default to `backups/`, which is ignored by Git. Set `BACKUP_DIRECTORY` to
an absolute path for scheduled jobs. Each run creates:

- a gzip-compressed MongoDB archive
- a JSON manifest containing SHA-256, size, tool version, and collection inventory
- the source MongoDB server version used to reject unsupported cross-major drills

Verify the archive before upload and again after download:

```sh
npm run db:backup:verify -- backups/<timestamp>-<database>.manifest.json
```

Treat both files as one backup unit. A manifest without its archive is unusable.

## Run an isolated restore drill

The target URI must name a separate, empty database whose name contains the
standalone token `restore_drill`. The confirmation must exactly match that name.

```sh
RESTORE_MONGODB_URI='mongodb://127.0.0.1:27017/rental_restore_drill_20260720' \
RESTORE_DRILL_CONFIRM='rental_restore_drill_20260720' \
npm run db:restore:drill -- backups/<timestamp>-rental.manifest.json
```

When the operating environment cannot run a matching local MongoDB version,
derive an isolated target database on the deployment already configured by
`MONGODB_URI` without copying its credentials into shell history:

```sh
RESTORE_DRILL_DATABASE='rental_restore_drill_20260720' \
RESTORE_DRILL_CONFIRM='rental_restore_drill_20260720' \
npm run db:restore:drill -- backups/<timestamp>-rental.manifest.json
```

This validates logical recoverability but does not test deployment-level disaster
isolation. Production drills should preferably target a separate recovery cluster
with matching MongoDB major and feature compatibility versions.

The command:

1. validates the manifest and archive checksum
2. refuses the source database or a target without `restore_drill` in its name
3. refuses a non-empty target database
4. requires the target MongoDB major version to match the recorded source version
5. restores namespaces into the drill database
6. compares collection names, document counts, and indexes with the manifest
7. preserves the drill database for application-level inspection

The script never drops a database. Inspect the restored application, migration
history, critical records, and access paths, then remove the drill database using
an independently reviewed administrative procedure.

For a write-heavy database, provider snapshots are the authoritative consistent
backup. Schedule logical dumps during a quiet period or use an appropriate
replica-set backup strategy because collection inventory and logical dump timing
can otherwise differ.

## Scheduled job checklist

1. Run with a dedicated backup identity.
2. Write to an encrypted temporary volume.
3. Verify the checksum.
4. Upload archive and manifest to protected object storage.
5. Verify the uploaded objects and enforce retention.
6. Remove the local temporary copy according to policy.
7. Emit duration, size, result, and backup age metrics without credentials.
8. Alert when any step fails or the latest successful backup exceeds the RPO.
