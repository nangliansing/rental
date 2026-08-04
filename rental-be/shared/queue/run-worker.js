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
import { createWorkerRedisCooldown } from "./worker-redis-cooldown.js";

export const resolveQueueWorkerOptions = (config = {}) => ({
  prefix: config.prefix,
  concurrency: config.workerConcurrency,
  // Longer empty-queue block timeout → fewer Upstash commands when idle.
  drainDelay: config.workerDrainDelaySeconds ?? 30,
});

export const resolveWorkerRedisCooldownOptions = (config = {}) => ({
  initialDelayMs: config.workerRedisCooldownInitialMs ?? 1_000,
  maxDelayMs: config.workerRedisCooldownMaxMs ?? 60_000,
});

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
  const workerOptions = resolveQueueWorkerOptions(config);

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
      ...workerOptions,
    },
  );

  const redisCooldown = createWorkerRedisCooldown({
    worker,
    logger,
    ...resolveWorkerRedisCooldownOptions(config),
  });

  worker.on("ready", () => {
    redisCooldown.reset();
    logger?.info(
      {
        event: "queue_worker_ready",
        queueName: QUEUE_NAMES.DEFAULT,
        concurrency: workerOptions.concurrency,
        drainDelay: workerOptions.drainDelay,
      },
      "Queue worker ready",
    );
  });

  worker.on("active", () => {
    redisCooldown.reset();
  });

  worker.on("error", (error) => {
    logger?.error(
      { err: error, event: "queue_worker_error" },
      "Queue worker error",
    );
    void redisCooldown.schedule(error);
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
