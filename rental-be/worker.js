import "dotenv/config";

import {
  connectDB,
  disconnectDB,
  initializeEnvironment,
} from "./config/index.js";
import { createLogger } from "./shared/observability/index.js";
import {
  createRealtimePublisher,
  registerDefaultJobHandlers,
  startQueueWorker,
} from "./shared/queue/index.js";
import {
  setWorkerRuntimeContext,
} from "./shared/queue/worker-context.js";
import {
  createWorkerGracefulShutdown,
  registerProcessHandlers,
} from "./shared/runtime/index.js";

let workerRuntime;
let realtimePublisher;
let logger = createLogger({ environment: process.env.NODE_ENV || "unknown" });

try {
  const config = initializeEnvironment();
  logger = createLogger({
    environment: config.nodeEnv,
    level: config.logging.level,
    serviceName: `${config.logging.serviceName}-worker`,
  });

  if (!config.queue.enabled) {
    throw new Error(
      "Worker process requires QUEUE_ENABLED=true and a reachable REDIS_URL",
    );
  }

  registerDefaultJobHandlers();

  await connectDB(config.mongodbUri, {
    autoIndex: !config.isProduction,
    logger,
  });

  realtimePublisher = await createRealtimePublisher(config.queue, { logger });

  setWorkerRuntimeContext({
    logger,
    publishRealtimeHint: realtimePublisher.publish.bind(realtimePublisher),
  });

  workerRuntime = await startQueueWorker(config.queue, { logger });

  const shutdown = createWorkerGracefulShutdown({
    closeDatabase: disconnectDB,
    closeQueueResources: async () => {
      await workerRuntime.close();
      await realtimePublisher.close();
    },
    logger,
    timeoutMs: config.shutdownTimeoutMs,
  });

  registerProcessHandlers({ logger, shutdown });

  logger.info({ event: "worker_started" }, "Background worker started");
} catch (error) {
  logger.fatal({ err: error, event: "worker_startup_failed" }, "Worker startup failed");

  await Promise.allSettled([
    workerRuntime?.close?.(),
    realtimePublisher?.close?.(),
    disconnectDB(),
  ]);

  process.exitCode = 1;
}
