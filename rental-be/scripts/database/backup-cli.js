import path from "node:path";

export const requireEnvironmentValue = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

export const resolveManifestPaths = (manifestPathInput) => {
  if (!manifestPathInput) {
    throw new Error("Backup manifest path is required");
  }

  const manifestPath = path.resolve(manifestPathInput);
  return { manifestPath, manifestDirectory: path.dirname(manifestPath) };
};

export const timestampForFileName = (date = new Date()) =>
  date.toISOString().replace(/[-:]/g, "").replace(".", "");
