import {
  MIGRATION_COLLECTION,
  MIGRATION_STATUSES,
} from "./constants.js";
import { acquireMigrationLock } from "./migration-lock.js";

const safeErrorMessage = (error) =>
  String(error?.message || error || "Migration failed").slice(0, 1000);

export const getMigrationStatus = async (db, migrations) => {
  const records = await db
    .collection(MIGRATION_COLLECTION)
    .find({}, { projection: { _id: 1, checksum: 1, status: 1, appliedAt: 1 } })
    .sort({ _id: 1 })
    .toArray();
  const recordsById = new Map(records.map((record) => [record._id, record]));
  const localIds = new Set(migrations.map((migration) => migration.id));
  const local = migrations.map((migration) => {
    const record = recordsById.get(migration.id);
    let state = "PENDING";

    if (record) {
      state =
        record.status === MIGRATION_STATUSES.APPLIED &&
        record.checksum !== migration.checksum
          ? "CHECKSUM_MISMATCH"
          : record.status;
    }

    return {
      id: migration.id,
      description: migration.description,
      state,
      appliedAt: record?.appliedAt ?? null,
    };
  });
  const missingFiles = records
    .filter((record) => !localIds.has(record._id))
    .map((record) => ({
      id: record._id,
      state: "MISSING_FILE",
      appliedAt: record.appliedAt ?? null,
    }));

  return [...local, ...missingFiles];
};

export const runMigrations = async (
  db,
  migrations,
  { lockOptions, logger = console } = {},
) => {
  const orderedMigrations = [...migrations].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const migrationIds = orderedMigrations.map((migration) => migration.id);
  if (new Set(migrationIds).size !== migrationIds.length) {
    throw new Error("Duplicate database migration id");
  }

  const collection = db.collection(MIGRATION_COLLECTION);
  const lock = await acquireMigrationLock(db, lockOptions);
  const summary = { applied: [], skipped: [] };

  try {
    for (const migration of orderedMigrations) {
      await lock.assertOwned();
      const existing = await collection.findOne({ _id: migration.id });

      if (existing?.status === MIGRATION_STATUSES.APPLIED) {
        if (existing.checksum !== migration.checksum) {
          throw new Error(`Checksum mismatch for applied migration ${migration.id}`);
        }

        summary.skipped.push(migration.id);
        continue;
      }

      const startedAt = new Date();
      await collection.updateOne(
        { _id: migration.id },
        {
          $set: {
            checksum: migration.checksum,
            description: migration.description,
            runnerId: lock.ownerId,
            status: MIGRATION_STATUSES.RUNNING,
            startedAt,
            appliedAt: null,
            durationMs: null,
          },
          $unset: { error: "" },
          $inc: { attempts: 1 },
        },
        { upsert: true },
      );

      logger.info?.(`Applying migration ${migration.id}`);

      try {
        await migration.up({ db, migrationId: migration.id });
        await lock.assertOwned();

        const appliedAt = new Date();
        const result = await collection.updateOne(
          {
            _id: migration.id,
            checksum: migration.checksum,
            runnerId: lock.ownerId,
          },
          {
            $set: {
              status: MIGRATION_STATUSES.APPLIED,
              appliedAt,
              durationMs: appliedAt.getTime() - startedAt.getTime(),
            },
            $unset: { error: "" },
          },
        );
        if (result.matchedCount !== 1) {
          throw new Error(`Migration history changed while applying ${migration.id}`);
        }
        summary.applied.push(migration.id);
        logger.info?.(`Applied migration ${migration.id}`);
      } catch (error) {
        const failedAt = new Date();
        await collection.updateOne(
          { _id: migration.id, runnerId: lock.ownerId },
          {
            $set: {
              checksum: migration.checksum,
              status: MIGRATION_STATUSES.FAILED,
              failedAt,
              durationMs: failedAt.getTime() - startedAt.getTime(),
              error: safeErrorMessage(error),
            },
          },
        );
        throw error;
      }
    }

    return summary;
  } finally {
    await lock.release();
  }
};
