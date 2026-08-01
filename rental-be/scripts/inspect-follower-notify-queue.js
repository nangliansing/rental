import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { validateEnvironment } from "../config/environment.js";
import {
  getQueue,
  initializeQueueProducer,
  closeQueueProducer,
} from "../shared/queue/queue-manager.js";
import Notification from "../modules/notification/notification.model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const env = validateEnvironment(process.env);
const JOB_PREFIX = "building.followers.notify-";

const inspectJobs = async () => {
  await mongoose.connect(env.mongodbUri);
  await initializeQueueProducer(env.queue, { logger: console });

  const queue = getQueue();
  const states = ["delayed", "waiting", "active", "completed", "failed"];

  console.log("\n=== Queue job states ===");
  for (const state of states) {
    const jobs = await queue.getJobs([state], 0, 50);
    const followerJobs = jobs.filter((job) =>
      String(job.id).startsWith(JOB_PREFIX),
    );

    if (followerJobs.length > 0) {
      console.log(`\n${state.toUpperCase()} (${followerJobs.length}):`);
      for (const job of followerJobs) {
        const actualState = await job.getState();
        console.log({
          id: job.id,
          state: actualState,
          delay: job.opts?.delay,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          failedReason: job.failedReason,
          data: job.data,
          returnvalue: job.returnvalue,
        });
      }
    }
  }

  console.log("\n=== Recent follower notifications (last 10) ===");
  const recent = await Notification.find({
    type: {
      $in: [
        "FOLLOWED_BUILDING_PRICE_DROPPED",
        "FOLLOWED_BUILDING_NEW_LISTING",
        "FOLLOWED_BUILDING_AVAILABLE_AGAIN",
      ],
    },
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .select("type userId createdAt dedupeKey title")
    .lean();

  console.log(recent);

  await closeQueueProducer();
  await mongoose.disconnect();
};

inspectJobs().catch((error) => {
  console.error(error);
  process.exit(1);
});
