import { Queue } from "bullmq";

import { QUEUE_NAMES } from "./constants.js";
import { QueueConfigurationError } from "./errors.js";
import {
  attachQueueConnectionLogging,
  closeQueueConnection,
  connectQueueRedis,
  createQueueConnection,
} from "./connection.js";

let queueState;

const buildDefaultJobOptions = (config) => ({
  attempts: config.defaultAttempts,
  backoff: {
    type: "exponential",
    delay: config.backoffDelayMs,
  },
  removeOnComplete: {
    age: config.removeOnCompleteAgeSeconds,
    count: config.removeOnCompleteCount,
  },
  removeOnFail: {
    age: config.removeOnFailAgeSeconds,
    count: config.removeOnFailCount,
  },
});

export const isQueueEnabled = () => Boolean(queueState?.enabled);

export const getQueue = () => {
  if (!queueState?.enabled || !queueState.queue) {
    throw new QueueConfigurationError("Queue producer is not initialized");
  }

  return queueState.queue;
};

export const initializeQueueProducer = async (config, { logger } = {}) => {
  if (!config?.enabled) {
    if (queueState && !queueState.enabled) {
      return queueState;
    }

    queueState = {
      enabled: false,
      close: async () => {},
    };

    logger?.info({ event: "queue_producer_disabled" }, "Queue producer disabled");
    return queueState;
  }

  if (queueState?.enabled) {
    return queueState;
  }

  const connection = createQueueConnection({ redisUrl: config.redisUrl });
  attachQueueConnectionLogging(connection, { logger, role: "producer" });
  await connectQueueRedis(connection);

  const queue = new Queue(QUEUE_NAMES.DEFAULT, {
    connection,
    prefix: config.prefix,
    defaultJobOptions: buildDefaultJobOptions(config),
  });

  queueState = {
    enabled: true,
    queue,
    connection,
    close: async () => {
      await queue.close();
      await closeQueueConnection(connection);
      queueState = undefined;
    },
  };

  logger?.info(
    {
      event: "queue_producer_initialized",
      prefix: config.prefix,
      queueName: QUEUE_NAMES.DEFAULT,
    },
    "Queue producer initialized",
  );

  return queueState;
};

export const resetQueueStateForTests = async () => {
  if (queueState?.close) {
    await queueState.close();
  }

  queueState = undefined;
};

export const closeQueueProducer = async () => {
  if (!queueState?.close) return;
  await queueState.close();
};
