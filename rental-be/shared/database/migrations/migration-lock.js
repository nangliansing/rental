import crypto from "node:crypto";

import {
  MIGRATION_LOCK_COLLECTION,
  MIGRATION_LOCK_ID,
} from "./constants.js";

export class MigrationLockError extends Error {
  constructor(message = "Another database migration process holds the lock") {
    super(message);
    this.name = "MigrationLockError";
  }
}

export const acquireMigrationLock = async (
  db,
  {
    heartbeatMs = 20_000,
    leaseMs = 60_000,
    ownerId = crypto.randomUUID(),
  } = {},
) => {
  if (heartbeatMs >= leaseMs) {
    throw new Error("Migration heartbeat must be shorter than the lease");
  }

  const collection = db.collection(MIGRATION_LOCK_COLLECTION);
  const now = new Date();

  try {
    await collection.findOneAndUpdate(
      {
        _id: MIGRATION_LOCK_ID,
        $or: [{ expiresAt: { $lte: now } }, { ownerId }],
      },
      {
        $set: {
          ownerId,
          acquiredAt: now,
          heartbeatAt: now,
          expiresAt: new Date(now.getTime() + leaseMs),
        },
      },
      { upsert: true },
    );
  } catch (error) {
    if (error?.code === 11000) throw new MigrationLockError();
    throw error;
  }

  let heartbeatError = null;
  let renewalPromise = null;

  const renew = () => {
    if (heartbeatError) return Promise.resolve();
    if (renewalPromise) return renewalPromise;

    renewalPromise = (async () => {
      try {
        const heartbeatAt = new Date();
        const result = await collection.updateOne(
          { _id: MIGRATION_LOCK_ID, ownerId },
          {
            $set: {
              heartbeatAt,
              expiresAt: new Date(heartbeatAt.getTime() + leaseMs),
            },
          },
        );

        if (result.matchedCount !== 1) {
          heartbeatError = new MigrationLockError("Database migration lock was lost");
        }
      } catch (error) {
        heartbeatError = error;
      } finally {
        renewalPromise = null;
      }
    })();

    return renewalPromise;
  };

  const heartbeat = setInterval(() => {
    void renew();
  }, heartbeatMs);
  heartbeat.unref?.();

  return {
    ownerId,
    async assertOwned() {
      if (heartbeatError) throw heartbeatError;
      await renew();
      if (heartbeatError) throw heartbeatError;
    },
    async release() {
      clearInterval(heartbeat);
      await collection.deleteOne({ _id: MIGRATION_LOCK_ID, ownerId });
    },
  };
};
