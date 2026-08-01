import "dotenv/config";
import { createServer } from "node:http";

import { createApp } from "./app.js";
import {
  connectDB,
  disconnectDB,
  initializeEnvironment,
  isDBReady,
} from "./config/index.js";
import { configureCloudinary } from "./shared/config/cloudinary.js";
import { createLogger } from "./shared/observability/index.js";
import {
  createGracefulShutdown,
  createRuntimeHealth,
  listen,
  registerProcessHandlers,
} from "./shared/runtime/index.js";
import { initializeRateLimitStore } from "./shared/security/index.js";
import {
  closeQueueProducer,
  createRealtimeSubscriber,
  initializeQueueProducer,
} from "./shared/queue/index.js";
import Notification from "./modules/notification/notification.model.js";
import {
  closeSocketServer,
  emitNotificationToUser,
  initializeSocketServer,
} from "./shared/socket/index.js";

let rateLimitStore;
let runtimeHealth;
let queueProducer;
let realtimeSubscriber;
let server;
let logger = createLogger({ environment: process.env.NODE_ENV || "unknown" });

try {
  const config = initializeEnvironment();
  logger = createLogger({
    environment: config.nodeEnv,
    level: config.logging.level,
    serviceName: config.logging.serviceName,
  });

  configureCloudinary(config.cloudinary);
  rateLimitStore = await initializeRateLimitStore(config.rateLimit, { logger });
  queueProducer = await initializeQueueProducer(config.queue, { logger });
  realtimeSubscriber = await createRealtimeSubscriber(config.queue, {
    logger,
    onHint: async ({ userId, notificationId }) => {
      const notification = await Notification.findById(notificationId).lean();
      if (!notification) return;
      if (notification.recipient.toString() !== userId) return;

      emitNotificationToUser(userId, notification);
    },
  });

  runtimeHealth = createRuntimeHealth({
    isDatabaseReady: isDBReady,
    isRateLimitStoreReady: rateLimitStore.isReady,
  });

  const app = createApp({
    config,
    createRateLimitStore: rateLimitStore.createStore,
    logger,
    runtimeHealth,
  });
  server = createServer(app);

  initializeSocketServer(server, { allowedOrigins: config.corsOrigins });

  const shutdown = createGracefulShutdown({
    server,
    runtimeHealth,
    closeSocketServer,
    closeDatabase: disconnectDB,
    closeRateLimitStore: rateLimitStore.close,
    closeQueueResources: async () => {
      await Promise.allSettled([
        closeQueueProducer(),
        realtimeSubscriber?.close?.(),
      ]);
    },
    logger,
    timeoutMs: config.shutdownTimeoutMs,
  });

  await listen(server, config.port);
  registerProcessHandlers({ logger, shutdown });

  await connectDB(config.mongodbUri, {
    autoIndex: !config.isProduction,
    logger,
  });

  runtimeHealth.markReady();

  logger.info(
    { event: "server_started", port: config.port },
    "Server started",
  );
} catch (error) {
  runtimeHealth?.markShuttingDown();
  logger.fatal({ err: error, event: "startup_failed" }, "Startup failed");

  server?.closeAllConnections?.();
  await Promise.allSettled([
    closeSocketServer(),
    disconnectDB(),
    rateLimitStore?.close?.(),
    closeQueueProducer(),
    realtimeSubscriber?.close?.(),
  ]);

  process.exitCode = 1;
}
