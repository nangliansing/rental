import path from "node:path";
import { fileURLToPath } from "node:url";

export const migrationsDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../migrations",
);

export const requireMongoDbUri = () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required");
  }

  return process.env.MONGODB_URI;
};

export const migrationLogger = Object.freeze({
  info(message) {
    console.log(message);
  },
});
