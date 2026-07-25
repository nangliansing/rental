import "dotenv/config";
import mongoose from "mongoose";

import { indexModels } from "./database/index-models.js";

const run = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false });

  for (const model of indexModels) {
    await model.createIndexes();
    console.log(`Created missing indexes for ${model.modelName}`);
  }
};

try {
  await run();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
