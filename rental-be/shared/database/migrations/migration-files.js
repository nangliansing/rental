import crypto from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const MIGRATION_FILE_PATTERN = /^\d{8}T\d{6}Z_[a-z0-9-]+\.js$/;

const validateMigrationModule = (migration, fileName) => {
  const expectedId = fileName.slice(0, -3);

  if (migration.id !== expectedId) {
    throw new Error(`Migration ${fileName} must export id ${expectedId}`);
  }

  if (typeof migration.description !== "string" || !migration.description.trim()) {
    throw new Error(`Migration ${fileName} must export a description`);
  }

  if (typeof migration.up !== "function") {
    throw new Error(`Migration ${fileName} must export an up function`);
  }
};

export const loadMigrationFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const fileNames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => entry.name)
    .sort();
  const invalidFile = fileNames.find(
    (fileName) => !MIGRATION_FILE_PATTERN.test(fileName),
  );

  if (invalidFile) {
    throw new Error(`Invalid migration filename: ${invalidFile}`);
  }

  const migrations = [];
  for (const fileName of fileNames) {
    const filePath = path.join(directory, fileName);
    const source = await readFile(filePath);
    const checksum = crypto.createHash("sha256").update(source).digest("hex");
    const moduleUrl = pathToFileURL(filePath);
    moduleUrl.searchParams.set("checksum", checksum);
    const imported = await import(moduleUrl.href);
    const migration = {
      checksum,
      description: imported.description,
      fileName,
      id: imported.id,
      up: imported.up,
    };

    validateMigrationModule(migration, fileName);
    migrations.push(migration);
  }

  return migrations;
};
