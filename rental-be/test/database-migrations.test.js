import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, beforeEach, describe, test } from "node:test";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server-core";

import {
  acquireMigrationLock,
  getMigrationStatus,
  loadMigrationFiles,
  MIGRATION_COLLECTION,
  MIGRATION_STATUSES,
  MigrationLockError,
  runMigrations,
} from "../shared/database/migrations/index.js";

const quietLogger = { info() {} };
let mongoServer;
let db;

const migration = (id, up, checksum = `${id}-checksum`) => ({
  id,
  checksum,
  description: `Migration ${id}`,
  up,
});

before(async () => {
  mongoServer = await MongoMemoryServer.create({
    binary: process.env.MONGOMS_SYSTEM_BINARY
      ? { systemBinary: process.env.MONGOMS_SYSTEM_BINARY }
      : { version: process.env.MONGOMS_VERSION || "7.0.14" },
  });
  await mongoose.connect(mongoServer.getUri("migration_test"), {
    autoIndex: false,
  });
  db = mongoose.connection.db;
});

beforeEach(async () => {
  await db.dropDatabase();
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});

describe("database migrations", () => {
  test("applies migrations in order and skips completed migrations", async () => {
    const executionOrder = [];
    const migrations = [
      migration("20260720T160001Z_second", async ({ db: database }) => {
        executionOrder.push(2);
        await database.collection("events").insertOne({ order: 2 });
      }),
      migration("20260720T160000Z_first", async ({ db: database }) => {
        executionOrder.push(1);
        await database.collection("events").insertOne({ order: 1 });
      }),
    ];

    const firstRun = await runMigrations(db, migrations, { logger: quietLogger });
    const secondRun = await runMigrations(db, migrations, { logger: quietLogger });
    const events = await db.collection("events").find().sort({ order: 1 }).toArray();
    const records = await db
      .collection(MIGRATION_COLLECTION)
      .find()
      .sort({ _id: 1 })
      .toArray();

    const orderedIds = migrations.map((item) => item.id).sort();
    assert.deepEqual(firstRun.applied, orderedIds);
    assert.deepEqual(secondRun.skipped, orderedIds);
    assert.deepEqual(executionOrder, [1, 2]);
    assert.deepEqual(events.map((event) => event.order), [1, 2]);
    assert.ok(records.every((record) => record.status === MIGRATION_STATUSES.APPLIED));
    assert.ok(records.every((record) => record.attempts === 1));
  });

  test("loads migration files lexically and checksums their exact source", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "rental-migrations-"));
    const firstId = "20260720T155959Z_first-file";
    const secondId = "20260720T160000Z_second-file";
    const source = (id) =>
      `export const id = "${id}";\nexport const description = "Test";\nexport const up = async () => {};\n`;

    try {
      await writeFile(path.join(directory, `${secondId}.js`), source(secondId));
      await writeFile(path.join(directory, `${firstId}.js`), source(firstId));

      const loaded = await loadMigrationFiles(directory);
      assert.deepEqual(loaded.map((item) => item.id), [firstId, secondId]);
      assert.equal(
        loaded[0].checksum,
        crypto.createHash("sha256").update(source(firstId)).digest("hex"),
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("rejects duplicate migration ids before taking the lock", async () => {
    const duplicate = migration("20260720T160001Z_duplicate", async () => {});

    await assert.rejects(
      runMigrations(db, [duplicate, duplicate], { logger: quietLogger }),
      /Duplicate database migration id/,
    );
  });

  test("rejects checksum drift for an applied migration", async () => {
    const id = "20260720T160002Z_checksum";
    await runMigrations(db, [migration(id, async () => {}, "checksum-one")], {
      logger: quietLogger,
    });

    await assert.rejects(
      runMigrations(db, [migration(id, async () => {}, "checksum-two")], {
        logger: quietLogger,
      }),
      /Checksum mismatch/,
    );

    const [status] = await getMigrationStatus(db, [
      migration(id, async () => {}, "checksum-two"),
    ]);
    assert.equal(status.state, "CHECKSUM_MISMATCH");
  });

  test("records failure without marking partial work as applied and permits retry", async () => {
    const id = "20260720T160003Z_retry";
    const partiallyFailing = migration(id, async ({ db: database }) => {
      await database.collection("retry_markers").updateOne(
        { _id: id },
        { $setOnInsert: { createdAt: new Date() } },
        { upsert: true },
      );
      throw new Error("simulated migration failure");
    });

    await assert.rejects(
      runMigrations(db, [partiallyFailing], { logger: quietLogger }),
      /simulated migration failure/,
    );

    const failed = await db.collection(MIGRATION_COLLECTION).findOne({ _id: id });
    assert.equal(failed.status, MIGRATION_STATUSES.FAILED);
    assert.equal(failed.appliedAt, null);

    const corrected = migration(id, async ({ db: database }) => {
      await database.collection("retry_markers").updateOne(
        { _id: id },
        { $setOnInsert: { createdAt: new Date() } },
        { upsert: true },
      );
    }, "corrected-checksum");
    await runMigrations(db, [corrected], { logger: quietLogger });

    const applied = await db.collection(MIGRATION_COLLECTION).findOne({ _id: id });
    assert.equal(applied.status, MIGRATION_STATUSES.APPLIED);
    assert.equal(applied.attempts, 2);
    assert.equal(await db.collection("retry_markers").countDocuments(), 1);
  });

  test("prevents concurrent migration runners", async () => {
    const heldLock = await acquireMigrationLock(db, {
      ownerId: "first-runner",
      heartbeatMs: 1_000,
      leaseMs: 10_000,
    });

    try {
      await assert.rejects(
        runMigrations(db, [], {
          logger: quietLogger,
          lockOptions: {
            ownerId: "second-runner",
            heartbeatMs: 1_000,
            leaseMs: 10_000,
          },
        }),
        MigrationLockError,
      );
    } finally {
      await heldLock.release();
    }
  });

  test("reports database records whose migration files are missing", async () => {
    await db.collection(MIGRATION_COLLECTION).insertOne({
      _id: "20260720T160004Z_removed",
      checksum: "checksum",
      status: MIGRATION_STATUSES.APPLIED,
      appliedAt: new Date(),
    });

    const statuses = await getMigrationStatus(db, []);
    assert.deepEqual(statuses.map((item) => item.state), ["MISSING_FILE"]);
  });
});
