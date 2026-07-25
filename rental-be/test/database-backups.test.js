import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import {
  assertSafeRestoreDrillTarget,
  assertCompatibleMongoVersions,
  buildRestoreArguments,
  compareDatabaseInventory,
  getDatabaseNameFromUri,
  readBackupManifest,
  replaceDatabaseNameInUri,
  sha256File,
  verifyBackupChecksum,
} from "../shared/database/backups/index.js";

describe("database backup safety", () => {
  test("extracts explicit database names without exposing credentials", () => {
    assert.equal(
      getDatabaseNameFromUri("mongodb://user:secret@localhost:27017/rental?authSource=admin"),
      "rental",
    );
    assert.equal(
      getDatabaseNameFromUri("mongodb+srv://user:secret@example.test/rental-prod"),
      "rental-prod",
    );
    assert.throws(
      () => getDatabaseNameFromUri("mongodb://localhost:27017/"),
      /explicit database name/,
    );
    assert.throws(
      () => getDatabaseNameFromUri("mongodb://localhost:27017"),
      /explicit database name/,
    );
  });

  test("derives a drill URI without changing credentials, hosts, or options", () => {
    assert.equal(
      replaceDatabaseNameInUri(
        "mongodb+srv://user:secret@example.test/rental?retryWrites=true",
        "rental_restore_drill_20260720",
      ),
      "mongodb+srv://user:secret@example.test/rental_restore_drill_20260720?retryWrites=true",
    );
    assert.throws(
      () => replaceDatabaseNameInUri("mongodb://localhost/rental", "bad/name"),
      /unsupported characters/,
    );
  });

  test("only permits separately named and explicitly confirmed drill databases", () => {
    assert.doesNotThrow(() =>
      assertSafeRestoreDrillTarget({
        confirmation: "rental_restore_drill_20260720",
        sourceDatabase: "rental",
        targetDatabase: "rental_restore_drill_20260720",
      }),
    );
    assert.throws(
      () =>
        assertSafeRestoreDrillTarget({
          confirmation: "rental",
          sourceDatabase: "rental",
          targetDatabase: "rental",
        }),
      /must differ/,
    );
    assert.throws(
      () =>
        assertSafeRestoreDrillTarget({
          confirmation: "rental-copy",
          sourceDatabase: "rental",
          targetDatabase: "rental-copy",
        }),
      /restore_drill/,
    );
    assert.throws(
      () =>
        assertSafeRestoreDrillTarget({
          confirmation: "wrong",
          sourceDatabase: "rental",
          targetDatabase: "rental_restore_drill_test",
        }),
      /exactly match/,
    );
  });

  test("requires matching MongoDB major versions when source metadata is available", () => {
    assert.doesNotThrow(() => assertCompatibleMongoVersions("8.0.27", "8.0.12"));
    assert.doesNotThrow(() => assertCompatibleMongoVersions(undefined, "7.0.14"));
    assert.throws(
      () => assertCompatibleMongoVersions("8.0.27", "7.0.14"),
      /major version must match/,
    );
  });

  test("includes source namespaces when remapping a restore archive", () => {
    assert.deepEqual(
      buildRestoreArguments({
        archivePath: "/tmp/backup.archive.gz",
        configPath: "/tmp/config.yml",
        sourceDatabase: "rental",
        targetDatabase: "rental_restore_drill_test",
      }),
      [
        "--config=/tmp/config.yml",
        "--archive=/tmp/backup.archive.gz",
        "--gzip",
        "--stopOnError",
        "--nsInclude=rental.*",
        "--nsFrom=rental.*",
        "--nsTo=rental_restore_drill_test.*",
      ],
    );
  });

  test("detects archive corruption and invalid manifests", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "rental-backup-test-"));
    const archivePath = path.join(directory, "backup.archive.gz");
    const manifestPath = path.join(directory, "backup.manifest.json");

    try {
      await writeFile(archivePath, "backup-content");
      const checksum = await sha256File(archivePath);
      await writeFile(
        manifestPath,
        JSON.stringify({
          formatVersion: 1,
          database: "rental",
          archive: { bytes: 14, file: "backup.archive.gz", sha256: checksum },
          collections: [],
        }),
      );

      const manifest = await readBackupManifest(manifestPath);
      await verifyBackupChecksum(archivePath, manifest.archive.sha256);
      await writeFile(archivePath, "corrupted");
      await assert.rejects(
        verifyBackupChecksum(archivePath, manifest.archive.sha256),
        /checksum does not match/,
      );

      await writeFile(
        manifestPath,
        JSON.stringify({
          ...manifest,
          archive: { ...manifest.archive, file: "../backup.archive.gz" },
        }),
      );
      await assert.rejects(readBackupManifest(manifestPath), /invalid format/);
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });

  test("reports missing data, count drift, and index drift", () => {
    const index = [{ name: "_id_", key: { _id: 1 }, unique: true }];
    const expected = [
      { name: "users", count: 2, indexes: index },
      { name: "listings", count: 1, indexes: index },
    ];
    const actual = [
      { name: "users", count: 1, indexes: [] },
      { name: "notifications", count: 1, indexes: index },
    ];

    assert.deepEqual(compareDatabaseInventory(expected, actual), [
      "users count differs: expected 2, restored 1",
      "users indexes differ",
      "missing collection: listings",
      "unexpected collection: notifications",
    ]);
  });
});
