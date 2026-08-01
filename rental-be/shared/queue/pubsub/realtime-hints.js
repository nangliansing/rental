import { REALTIME_PUBSUB_CHANNEL } from "../constants.js";
import {
  attachQueueConnectionLogging,
  closeQueueConnection,
  connectQueueRedis,
  createQueueConnection,
} from "../connection.js";
import { parseRealtimeHint } from "./parse-realtime-hint.js";

export { parseRealtimeHint } from "./parse-realtime-hint.js";

export const createRealtimePublisher = async (config, { logger } = {}) => {
  if (!config?.enabled) {
    return {
      publish: async () => ({ published: false, reason: "disabled" }),
      close: async () => {},
    };
  }

  const connection = createQueueConnection({ redisUrl: config.redisUrl });
  attachQueueConnectionLogging(connection, { logger, role: "realtime-publisher" });
  await connectQueueRedis(connection);

  return {
    publish: async ({ userId, notificationId }) => {
      if (typeof userId !== "string" || userId.trim().length === 0) {
        throw new TypeError("Realtime hint userId is required");
      }

      if (
        typeof notificationId !== "string" ||
        notificationId.trim().length === 0
      ) {
        throw new TypeError("Realtime hint notificationId is required");
      }

      const payload = JSON.stringify({
        userId: userId.trim(),
        notificationId: notificationId.trim(),
      });

      await connection.publish(REALTIME_PUBSUB_CHANNEL, payload);

      return { published: true };
    },
    close: async () => {
      await closeQueueConnection(connection);
    },
  };
};

export const createRealtimeSubscriber = async (
  config,
  { logger, onHint } = {},
) => {
  if (!config?.enabled) {
    return {
      close: async () => {},
    };
  }

  const connection = createQueueConnection({
    redisUrl: config.redisUrl,
    maxRetriesPerRequest: null,
  });
  attachQueueConnectionLogging(connection, { logger, role: "realtime-subscriber" });
  await connectQueueRedis(connection);

  const subscriber = connection.duplicate();
  attachQueueConnectionLogging(subscriber, {
    logger,
    role: "realtime-subscriber-listener",
  });
  await connectQueueRedis(subscriber);

  await subscriber.subscribe(REALTIME_PUBSUB_CHANNEL);

  subscriber.on("message", (channel, message) => {
    if (channel !== REALTIME_PUBSUB_CHANNEL) return;

    const hint = parseRealtimeHint(message);
    if (!hint) {
      logger?.warn(
        { event: "realtime_hint_invalid" },
        "Ignored invalid realtime hint",
      );
      return;
    }

    try {
      onHint?.(hint);
    } catch (error) {
      logger?.error(
        { err: error, event: "realtime_hint_handler_failed", ...hint },
        "Realtime hint handler failed",
      );
    }
  });

  logger?.info(
    { event: "realtime_subscriber_ready", channel: REALTIME_PUBSUB_CHANNEL },
    "Realtime subscriber ready",
  );

  return {
    close: async () => {
      try {
        if (subscriber.status !== "end") {
          await subscriber.quit();
        }
      } catch {
        subscriber.disconnect();
      }

      await closeQueueConnection(connection);
    },
  };
};
