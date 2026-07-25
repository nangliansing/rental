import "dotenv/config";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

import AgentProfile from "../modules/agent/agent-profile.model.js";

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const result = await AgentProfile.collection.updateMany(
    { isActive: { $exists: true } },
    [
      {
        $set: {
          isOnline: { $ifNull: ["$isOnline", "$isActive"] },
        },
      },
      {
        $unset: "isActive",
      },
    ],
  );

  console.log(
    `Migrated agent profile online status: matched=${result.matchedCount}, modified=${result.modifiedCount}`,
  );

  await mongoose.disconnect();
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  });
}
