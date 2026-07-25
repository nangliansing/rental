import path from "node:path";

import {
  readBackupManifest,
  verifyBackupChecksum,
} from "../shared/database/backups/index.js";
import { resolveManifestPaths } from "./database/backup-cli.js";

try {
  const { manifestDirectory, manifestPath } = resolveManifestPaths(process.argv[2]);
  const manifest = await readBackupManifest(manifestPath);
  const archivePath = path.resolve(manifestDirectory, manifest.archive.file);
  await verifyBackupChecksum(archivePath, manifest.archive.sha256);
  console.log(`Backup verified: ${manifestPath}`);
  console.log(
    `Database: ${manifest.database}; collections: ${manifest.collections.length}; checksum: ${manifest.archive.sha256}`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
