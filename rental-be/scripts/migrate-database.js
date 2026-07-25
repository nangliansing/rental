import "dotenv/config";
import mongoose from "mongoose";

import {
  loadMigrationFiles,
  runMigrations,
} from "../shared/database/migrations/index.js";
import {
  migrationLogger,
  migrationsDirectory,
  requireMongoDbUri,
} from "./database/migration-cli.js";

try {
  await mongoose.connect(requireMongoDbUri(), { autoIndex: false });
  const migrations = await loadMigrationFiles(migrationsDirectory);
  const summary = await runMigrations(mongoose.connection.db, migrations, {
    logger: migrationLogger,
  });

  console.log(
    `Migration run complete: applied=${summary.applied.length}, skipped=${summary.skipped.length}`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
