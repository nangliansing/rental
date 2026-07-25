import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { loadMigrationFiles } from "../shared/database/migrations/index.js";
import { indexModels } from "./database/index-models.js";
import { indexSignature, normalizeExpectedIndex } from "./database/index-utils.js";
import { migrationsDirectory } from "./database/migration-cli.js";

const readJson = async (filePath) =>
  JSON.parse(await readFile(new URL(filePath, import.meta.url), "utf8"));

const assertRuntime = (packageJson) => {
  const [major, minor] = process.versions.node.split(".").map(Number);
  assert.equal(major, 22, "CI contracts require Node.js 22");
  assert.ok(minor >= 17, "CI contracts require Node.js 22.17 or newer");
  assert.equal(packageJson.engines.node, ">=22.17.0 <23");
  assert.equal(packageJson.packageManager, "npm@10.9.2");
};

const assertLockfile = (packageJson, packageLock) => {
  const root = packageLock.packages?.[""];
  assert.equal(packageLock.lockfileVersion, 3, "package-lock.json must use version 3");
  assert.equal(packageLock.name, packageJson.name);
  assert.equal(packageLock.version, packageJson.version);
  assert.deepEqual(root?.dependencies || {}, packageJson.dependencies || {});
  assert.deepEqual(root?.devDependencies || {}, packageJson.devDependencies || {});
  assert.deepEqual(root?.engines || {}, packageJson.engines || {});
};

const assertIndexContracts = () => {
  assert.ok(indexModels.length > 0, "At least one indexed model is required");

  for (const model of indexModels) {
    const signatures = model.schema.indexes().map(normalizeExpectedIndex).map(indexSignature);
    assert.equal(
      new Set(signatures).size,
      signatures.length,
      `${model.modelName} contains duplicate index definitions`,
    );
  }
};

const packageJson = await readJson("../package.json");
const packageLock = await readJson("../package-lock.json");
assertRuntime(packageJson);
assertLockfile(packageJson, packageLock);
assertIndexContracts();

const migrations = await loadMigrationFiles(migrationsDirectory);
assert.ok(migrations.length > 0, "At least one versioned migration is required");

console.log(
  `CI contracts valid: Node ${process.versions.node}, ${indexModels.length} indexed models, ${migrations.length} migration(s)`,
);
