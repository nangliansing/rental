import "dotenv/config";
import path from "node:path";

import mongoose from "mongoose";

import {
  assertSafeRestoreDrillTarget,
  assertCompatibleMongoVersions,
  buildRestoreArguments,
  collectDatabaseInventory,
  compareDatabaseInventory,
  getDatabaseNameFromUri,
  getDatabaseToolVersion,
  readBackupManifest,
  replaceDatabaseNameInUri,
  runDatabaseTool,
  verifyBackupChecksum,
  withPrivateMongoConfig,
} from "../shared/database/backups/index.js";
import {
  requireEnvironmentValue,
  resolveManifestPaths,
} from "./database/backup-cli.js";

const run = async () => {
  const { manifestDirectory, manifestPath } = resolveManifestPaths(process.argv[2]);
  const manifest = await readBackupManifest(manifestPath);
  const archivePath = path.resolve(manifestDirectory, manifest.archive.file);
  const explicitTargetUri = process.env.RESTORE_MONGODB_URI?.trim();
  const targetUri = explicitTargetUri || replaceDatabaseNameInUri(
    requireEnvironmentValue("MONGODB_URI"),
    requireEnvironmentValue("RESTORE_DRILL_DATABASE"),
  );
  const targetDatabase = getDatabaseNameFromUri(
    targetUri,
    "RESTORE_MONGODB_URI",
  );

  assertSafeRestoreDrillTarget({
    confirmation: process.env.RESTORE_DRILL_CONFIRM?.trim(),
    sourceDatabase: manifest.database,
    targetDatabase,
  });
  await verifyBackupChecksum(archivePath, manifest.archive.sha256);
  await getDatabaseToolVersion("mongorestore");

  await mongoose.connect(targetUri, { autoIndex: false });
  const { version: targetServerVersion } = await mongoose.connection.db.command({
    buildInfo: 1,
  });
  assertCompatibleMongoVersions(manifest.serverVersion, targetServerVersion);
  const existingCollections = await mongoose.connection.db
    .listCollections({}, { nameOnly: true })
    .toArray();
  if (existingCollections.some(({ name }) => !name.startsWith("system."))) {
    throw new Error("Restore drill target database must be empty");
  }
  await mongoose.disconnect();

  await withPrivateMongoConfig(targetUri, (configPath) =>
    runDatabaseTool(
      "mongorestore",
      buildRestoreArguments({
        archivePath,
        configPath,
        sourceDatabase: manifest.database,
        targetDatabase,
      }),
    ),
  );

  await mongoose.connect(targetUri, { autoIndex: false });
  const restoredInventory = await collectDatabaseInventory(mongoose.connection.db);
  const issues = compareDatabaseInventory(manifest.collections, restoredInventory);
  if (issues.length > 0) {
    throw new Error(`Restore verification failed:\n- ${issues.join("\n- ")}`);
  }

  console.log(`Restore drill passed for database: ${targetDatabase}`);
  console.log(`Verified ${restoredInventory.length} collections, counts, and indexes`);
  console.log("The drill database was preserved for inspection and must be removed separately");
};

try {
  await run();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
