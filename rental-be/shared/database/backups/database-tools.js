import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const runDatabaseTool = async (command, args, options = {}) => {
  try {
    return await execFileAsync(command, args, {
      maxBuffer: 10 * 1024 * 1024,
      ...options,
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(
        `${command} is required. Install the MongoDB Database Tools before running this command`,
      );
    }

    const detail = error.stderr?.trim();
    throw new Error(`${command} failed${detail ? `: ${detail}` : ""}`);
  }
};

export const getDatabaseToolVersion = async (command) => {
  const { stdout } = await runDatabaseTool(command, ["--version"]);
  return stdout.split("\n")[0].trim();
};

export const withPrivateMongoConfig = async (uri, operation) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "rental-mongodb-tool-"));
  const configPath = path.join(directory, "config.yml");

  try {
    await writeFile(configPath, JSON.stringify({ uri }), { mode: 0o600 });
    return await operation(configPath);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
};
