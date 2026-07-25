import { RedisStore } from "rate-limit-redis";
import { createClient } from "redis";

export const initializeRateLimitStore = async (
  { store, redisUrl },
  { logger } = {},
) => {
  if (store !== "redis") {
    return {
      createStore: () => undefined,
      close: async () => {},
      isReady: () => true,
    };
  }

  const client = createClient({ url: redisUrl });

  client.on("error", (error) => {
    logger?.error(
      { err: error, event: "redis_rate_limit_store_error" },
      "Redis rate-limit store error",
    );
  });

  await client.connect();
  logger?.info(
    { event: "redis_rate_limit_store_connected" },
    "Redis rate-limit store connected",
  );

  return {
    createStore: (prefix) =>
      new RedisStore({
        prefix: `rental:rate-limit:${prefix}:`,
        sendCommand: (...args) => client.sendCommand(args),
      }),
    close: async () => {
      if (client.isOpen) {
        await client.quit();
      }
    },
    isReady: () => client.isReady,
  };
};
