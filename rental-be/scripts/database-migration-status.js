import "dotenv/config";
import mongoose from "mongoose";

import {
  getMigrationStatus,
  loadMigrationFiles,
} from "../shared/database/migrations/index.js";
import {
  migrationsDirectory,
  requireMongoDbUri,
} from "./database/migration-cli.js";

const unsafeStates = new Set([
  "CHECKSUM_MISMATCH",
  "FAILED",
  "MISSING_FILE",
  "RUNNING",
]);

try {
  await mongoose.connect(requireMongoDbUri(), { autoIndex: false });
  const migrations = await loadMigrationFiles(migrationsDirectory);
  const statuses = await getMigrationStatus(mongoose.connection.db, migrations);

  for (const migration of statuses) {
    console.log(
      `${migration.state.padEnd(18)} ${migration.id}${
        migration.description ? ` - ${migration.description}` : ""
      }`,
    );
  }

  if (statuses.some((migration) => unsafeStates.has(migration.state))) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
