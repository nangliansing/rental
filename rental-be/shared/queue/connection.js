import IORedis from "ioredis";

export const createQueueConnection = ({ redisUrl, maxRetriesPerRequest = null }) => {
  if (typeof redisUrl !== "string" || redisUrl.trim().length === 0) {
    throw new Error("Queue Redis URL is required");
  }

  return new IORedis(redisUrl.trim(), {
    maxRetriesPerRequest,
    enableReadyCheck: true,
    lazyConnect: true,
  });
};

export const attachQueueConnectionLogging = (connection, { logger, role }) => {
  if (!connection || !logger) return;

  connection.on("connect", () => {
    logger.info(
      { event: "queue_redis_connected", role },
      "Queue Redis connected",
    );
  });

  connection.on("error", (error) => {
    logger.error(
      { err: error, event: "queue_redis_error", role },
      "Queue Redis error",
    );
  });

  connection.on("close", () => {
    logger.info({ event: "queue_redis_closed", role }, "Queue Redis closed");
  });
};

export const connectQueueRedis = async (connection) => {
  if (!connection) return;

  if (connection.status === "wait") {
    await connection.connect();
  }
};

export const closeQueueConnection = async (connection) => {
  if (!connection) return;

  try {
    if (connection.status !== "end") {
      await connection.quit();
    }
  } catch {
    connection.disconnect();
  }
};
