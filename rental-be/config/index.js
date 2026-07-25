import mongoose from "mongoose";

export const connectDB = async (
  mongodbUri,
  { autoIndex = true, logger } = {},
) => {
  await mongoose.connect(mongodbUri, { autoIndex });
  logger?.info({ event: "mongodb_connected" }, "MongoDB connected");
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

export const isDBReady = () => mongoose.connection.readyState === 1;

export {
  EnvironmentValidationError,
  getEnvironment,
  initializeEnvironment,
  validateEnvironment,
} from "./environment.js";
