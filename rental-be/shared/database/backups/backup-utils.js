import crypto from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const MONGODB_SCHEMES = ["mongodb://", "mongodb+srv://"];
const RESTORE_DRILL_DATABASE_PATTERN = /(^|_)restore_drill(_|$)/;

export const getDatabaseNameFromUri = (uri, label = "MongoDB URI") => {
  if (
    typeof uri !== "string" ||
    !MONGODB_SCHEMES.some((scheme) => uri.startsWith(scheme))
  ) {
    throw new Error(`${label} must use the mongodb:// or mongodb+srv:// scheme`);
  }

  const withoutQuery = uri.split("?", 1)[0];
  const authorityStart = withoutQuery.indexOf("://") + 3;
  const databaseSeparator = withoutQuery.indexOf("/", authorityStart);

  if (databaseSeparator === -1) {
    throw new Error(`${label} must include an explicit database name`);
  }

  let databaseName;
  try {
    databaseName = decodeURIComponent(withoutQuery.slice(databaseSeparator + 1));
  } catch {
    throw new Error(`${label} contains an invalid encoded database name`);
  }

  if (!databaseName || databaseName.includes("/")) {
    throw new Error(`${label} must include an explicit database name`);
  }

  return databaseName;
};

export const replaceDatabaseNameInUri = (uri, databaseName) => {
  getDatabaseNameFromUri(uri);

  if (
    typeof databaseName !== "string" ||
    !databaseName ||
    /[/\\."$*<>:|?\s]/.test(databaseName)
  ) {
    throw new Error("Restore drill database name contains unsupported characters");
  }

  const queryIndex = uri.indexOf("?");
  const withoutQuery = queryIndex === -1 ? uri : uri.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : uri.slice(queryIndex);
  const authorityStart = withoutQuery.indexOf("://") + 3;
  const databaseSeparator = withoutQuery.indexOf("/", authorityStart);

  return `${withoutQuery.slice(0, databaseSeparator + 1)}${databaseName}${query}`;
};

export const assertSafeRestoreDrillTarget = ({
  confirmation,
  sourceDatabase,
  targetDatabase,
}) => {
  if (sourceDatabase === targetDatabase) {
    throw new Error("Restore drill database must differ from the source database");
  }

  if (!RESTORE_DRILL_DATABASE_PATTERN.test(targetDatabase)) {
    throw new Error(
      "Restore drill database name must contain the separate token restore_drill",
    );
  }

  if (confirmation !== targetDatabase) {
    throw new Error(
      "RESTORE_DRILL_CONFIRM must exactly match the restore drill database name",
    );
  }
};

export const assertCompatibleMongoVersions = (sourceVersion, targetVersion) => {
  if (!sourceVersion) return;

  const sourceMajor = Number.parseInt(sourceVersion, 10);
  const targetMajor = Number.parseInt(targetVersion, 10);

  if (
    !Number.isInteger(sourceMajor) ||
    !Number.isInteger(targetMajor) ||
    sourceMajor !== targetMajor
  ) {
    throw new Error(
      `Restore MongoDB major version must match the backup source: source ${sourceVersion}, target ${targetVersion}`,
    );
  }
};

export const buildRestoreArguments = ({
  archivePath,
  configPath,
  sourceDatabase,
  targetDatabase,
}) => [
  `--config=${configPath}`,
  `--archive=${archivePath}`,
  "--gzip",
  "--stopOnError",
  `--nsInclude=${sourceDatabase}.*`,
  `--nsFrom=${sourceDatabase}.*`,
  `--nsTo=${targetDatabase}.*`,
];

export const sha256File = (filePath) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });

export const readBackupManifest = async (manifestPath) => {
  let manifest;

  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read backup manifest: ${error.message}`);
  }

  if (
    manifest?.formatVersion !== 1 ||
    typeof manifest.database !== "string" ||
    (manifest.serverVersion !== undefined &&
      typeof manifest.serverVersion !== "string") ||
    typeof manifest.archive?.file !== "string" ||
    path.basename(manifest.archive?.file || "") !== manifest.archive?.file ||
    !Number.isSafeInteger(manifest.archive?.bytes) ||
    manifest.archive.bytes < 1 ||
    !/^[a-f\d]{64}$/.test(manifest.archive?.sha256 || "") ||
    !Array.isArray(manifest.collections)
  ) {
    throw new Error("Backup manifest has an unsupported or invalid format");
  }

  return manifest;
};

export const verifyBackupChecksum = async (archivePath, expectedChecksum) => {
  const actualChecksum = await sha256File(archivePath);

  if (actualChecksum !== expectedChecksum) {
    throw new Error("Backup archive checksum does not match its manifest");
  }

  return actualChecksum;
};

const comparableIndexes = (indexes) =>
  indexes
    .map(({ key, name, unique = false, sparse = false, expireAfterSeconds }) => ({
      expireAfterSeconds: expireAfterSeconds ?? null,
      key,
      name,
      sparse,
      unique,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

export const collectDatabaseInventory = async (db) => {
  const collectionNames = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map(({ name }) => name)
    .filter((name) => !name.startsWith("system."))
    .sort();
  const collections = [];

  for (const name of collectionNames) {
    const collection = db.collection(name);
    collections.push({
      count: await collection.countDocuments({}),
      indexes: comparableIndexes(await collection.indexes()),
      name,
    });
  }

  return collections;
};

export const compareDatabaseInventory = (expected, actual) => {
  const actualByName = new Map(actual.map((collection) => [collection.name, collection]));
  const issues = [];

  for (const expectedCollection of expected) {
    const actualCollection = actualByName.get(expectedCollection.name);

    if (!actualCollection) {
      issues.push(`missing collection: ${expectedCollection.name}`);
      continue;
    }

    if (actualCollection.count !== expectedCollection.count) {
      issues.push(
        `${expectedCollection.name} count differs: expected ${expectedCollection.count}, restored ${actualCollection.count}`,
      );
    }

    if (
      JSON.stringify(actualCollection.indexes) !==
      JSON.stringify(expectedCollection.indexes)
    ) {
      issues.push(`${expectedCollection.name} indexes differ`);
    }
  }

  for (const actualCollection of actual) {
    if (!expected.some(({ name }) => name === actualCollection.name)) {
      issues.push(`unexpected collection: ${actualCollection.name}`);
    }
  }

  return issues;
};
