import "dotenv/config";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import mongoose from "mongoose";

import {
  collectDatabaseInventory,
  getDatabaseNameFromUri,
  getDatabaseToolVersion,
  runDatabaseTool,
  sha256File,
  withPrivateMongoConfig,
} from "../shared/database/backups/index.js";
import {
  requireEnvironmentValue,
  timestampForFileName,
} from "./database/backup-cli.js";

process.umask(0o077);

const run = async () => {
  const uri = requireEnvironmentValue("MONGODB_URI");
  const database = getDatabaseNameFromUri(uri, "MONGODB_URI");
  const outputDirectory = path.resolve(
    process.env.BACKUP_DIRECTORY?.trim() || "backups",
  );
  const baseName = `${timestampForFileName()}-${database}`;
  const archivePath = path.join(outputDirectory, `${baseName}.archive.gz`);
  const manifestPath = path.join(outputDirectory, `${baseName}.manifest.json`);

  await mkdir(outputDirectory, { mode: 0o700, recursive: true });
  const toolVersion = await getDatabaseToolVersion("mongodump");
  await mongoose.connect(uri, { autoIndex: false });
  const { version: serverVersion } = await mongoose.connection.db.command({
    buildInfo: 1,
  });
  const collections = await collectDatabaseInventory(mongoose.connection.db);

  await withPrivateMongoConfig(uri, (configPath) =>
    runDatabaseTool("mongodump", [
      `--config=${configPath}`,
      `--db=${database}`,
      `--archive=${archivePath}`,
      "--gzip",
    ]),
  );

  const archiveStat = await stat(archivePath);
  const manifest = {
    formatVersion: 1,
    createdAt: new Date().toISOString(),
    database,
    serverVersion,
    tool: toolVersion,
    archive: {
      bytes: archiveStat.size,
      file: path.basename(archivePath),
      sha256: await sha256File(archivePath),
    },
    collections,
  };

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    mode: 0o600,
    flag: "wx",
  });
  console.log(`Database backup created: ${manifestPath}`);
  console.log(`Collections: ${collections.length}; archive bytes: ${archiveStat.size}`);
};

try {
  await run();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
