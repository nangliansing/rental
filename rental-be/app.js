import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { getEnvironment } from "./config/index.js";
import router from "./routes/api.routes.js";
import {
  createLogger,
  createMetrics,
  createRequestContextMiddleware,
  createRequestLoggerMiddleware,
  getRequestLogger,
} from "./shared/observability/index.js";
import {
  globalRateLimit,
  initializeRateLimiters,
  mutationRateLimit,
  readRateLimit,
} from "./shared/security/index.js";
import { createReadyRuntimeHealth } from "./shared/runtime/index.js";

const createCorsOptions = (allowedOrigins) => ({
  credentials: true,
  origin(origin, callback) {
    return callback(null, !origin || allowedOrigins.includes(origin));
  },
});

export const createApp = ({
  config = getEnvironment(),
  createRateLimitStore = () => undefined,
  logger = createLogger({
    environment: config.nodeEnv,
    level: config.logging.level,
    serviceName: config.logging.serviceName,
  }),
  runtimeHealth = createReadyRuntimeHealth(),
} = {}) => {
  const app = express();
  const metrics = createMetrics({
    config: config.metrics,
    runtimeHealth,
  });

  initializeRateLimiters({
    config: config.rateLimit,
    createStore: createRateLimitStore,
  });

  app.set("trust proxy", config.trustProxyHops);
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors(createCorsOptions(config.corsOrigins)));
  app.use(createRequestContextMiddleware({ logger }));
  app.use(createRequestLoggerMiddleware());

  const sendLiveness = (req, res) =>
    res.status(200).json({
      success: true,
      message: "OK",
    });

  app.get("/health", sendLiveness);
  app.get("/health/live", sendLiveness);
  app.get("/health/ready", (req, res) => {
    if (!runtimeHealth.isReady()) {
      return res.status(503).json({
        success: false,
        code: "SERVICE_NOT_READY",
        message: "Service is not ready",
        requestId: req.id,
      });
    }

    return res.status(200).json({
      success: true,
      message: "READY",
    });
  });

  if (metrics) {
    app.use(metrics.middleware);
  }
  app.use(globalRateLimit);
  if (metrics) {
    app.get("/metrics", metrics.handler);
  }
  app.use(cookieParser());
  app.use(express.json({ strict: false, limit: config.jsonBodyLimit }));

  app.use("/api/v1", readRateLimit, mutationRateLimit, router);

  app.use((req, res) => {
    return res.status(404).json({
      success: false,
      code: "NOT_FOUND",
      message: "Route not found",
      requestId: req.id,
    });
  });

  app.use((err, req, res, next) => {
    if (err?.type === "entity.parse.failed") {
      return res.status(400).json({
        success: false,
        code: "INVALID_JSON",
        message: "Request body must be valid JSON",
        requestId: req.id,
      });
    }

    if (err?.type === "entity.too.large") {
      return res.status(413).json({
        success: false,
        code: "PAYLOAD_TOO_LARGE",
        message: "Request body is too large",
        requestId: req.id,
      });
    }

    const statusCode = err.statusCode || 500;

    if (statusCode >= 500) {
      getRequestLogger(req, logger).error(
        {
          code: err.code || "INTERNAL_ERROR",
          err,
          event: "request_failed",
          statusCode,
        },
        "Request failed",
      );
    }

    return res.status(statusCode).json({
      success: false,
      code: err.code || "INTERNAL_ERROR",
      message:
        statusCode === 500 && config.isProduction
          ? "Internal server error"
          : err.message || "Internal server error",
      requestId: req.id,
    });
  });

  return app;
};
