import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { migrationsDirectory } from "./database/migration-cli.js";

const rawName = process.argv.slice(2).join(" ").trim();
const slug = rawName
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

if (!slug) {
  throw new Error("Migration name is required");
}

const timestamp = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace(/\.\d{3}Z$/, "Z");
const id = `${timestamp}_${slug}`;
const filePath = path.join(migrationsDirectory, `${id}.js`);
const source = `export const id = "${id}";
export const description = ${JSON.stringify(rawName)};

export const up = async ({ db }) => {
  // Keep migrations forward-only and safe to retry after partial failure.
};
`;

await mkdir(migrationsDirectory, { recursive: true });
await writeFile(filePath, source, { flag: "wx" });
console.log(filePath);
