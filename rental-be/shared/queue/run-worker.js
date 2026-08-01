import { Worker, UnrecoverableError } from "bullmq";

import { QUEUE_NAMES } from "./constants.js";
import { UnknownJobHandlerError } from "./errors.js";
import {
  attachQueueConnectionLogging,
  closeQueueConnection,
  connectQueueRedis,
  createQueueConnection,
} from "./connection.js";
import { createJobHandlerRunner } from "./handlers/registry.js";

export const startQueueWorker = async (config, { logger } = {}) => {
  if (!config?.enabled) {
    throw new Error("Queue worker cannot start when QUEUE_ENABLED=false");
  }

  const connection = createQueueConnection({
    redisUrl: config.redisUrl,
    maxRetriesPerRequest: null,
  });
  attachQueueConnectionLogging(connection, { logger, role: "worker" });
  await connectQueueRedis(connection);

  const processor = createJobHandlerRunner({ logger });

  const worker = new Worker(
    QUEUE_NAMES.DEFAULT,
    async (job) => {
      try {
        return await processor(job);
      } catch (error) {
        if (error instanceof UnknownJobHandlerError) {
          throw new UnrecoverableError(error.message);
        }

        throw error;
      }
    },
    {
      connection,
      prefix: config.prefix,
      concurrency: config.workerConcurrency,
    },
  );

  worker.on("ready", () => {
    logger?.info(
      {
        event: "queue_worker_ready",
        queueName: QUEUE_NAMES.DEFAULT,
        concurrency: config.workerConcurrency,
      },
      "Queue worker ready",
    );
  });

  worker.on("error", (error) => {
    logger?.error(
      { err: error, event: "queue_worker_error" },
      "Queue worker error",
    );
  });

  worker.on("failed", (job, error) => {
    logger?.error(
      {
        err: error,
        event: "queue_worker_job_failed",
        jobName: job?.name,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
      },
      "Queue worker job failed",
    );
  });

  await worker.waitUntilReady();

  return {
    worker,
    connection,
    close: async () => {
      await worker.close();
      await closeQueueConnection(connection);
    },
  };
};
