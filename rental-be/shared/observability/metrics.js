import crypto from "node:crypto";
import client from "prom-client";

import {
  isQuietOperationalPath,
  normalizeHttpPath,
} from "./http-path.js";

const safeTokenMatches = (providedToken, configuredToken) => {
  if (!configuredToken) return true;

  const provided = crypto
    .createHash("sha256")
    .update(providedToken || "")
    .digest();
  const configured = crypto
    .createHash("sha256")
    .update(configuredToken)
    .digest();

  return Boolean(providedToken) && crypto.timingSafeEqual(provided, configured);
};

const readBearerToken = (req) => {
  const authorization = req.get("authorization");

  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
};

export const createMetrics = ({ config, runtimeHealth }) => {
  if (!config.enabled) return null;

  const register = new client.Registry();

  if (config.collectDefaultMetrics) {
    client.collectDefaultMetrics({
      prefix: "rental_",
      register,
    });
  }

  const requestCount = new client.Counter({
    name: "rental_http_requests_total",
    help: "Completed HTTP requests",
    labelNames: ["method", "route", "status_code"],
    registers: [register],
  });
  const requestDuration = new client.Histogram({
    name: "rental_http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [register],
  });
  const activeRequests = new client.Gauge({
    name: "rental_http_active_requests",
    help: "HTTP requests currently being processed",
    registers: [register],
  });
  const dependencyReady = new client.Gauge({
    name: "rental_dependency_ready",
    help: "Dependency readiness, where 1 is ready",
    labelNames: ["dependency"],
    registers: [register],
  });

  const middleware = (req, res, next) => {
    if (isQuietOperationalPath(req.path)) return next();

    const startedAt = process.hrtime.bigint();
    let completed = false;
    activeRequests.inc();

    const recordRequest = () => {
      if (completed) return;
      completed = true;

      const labels = {
        method: req.method,
        route: normalizeHttpPath(req),
        status_code: String(res.statusCode),
      };
      const durationSeconds =
        Number(process.hrtime.bigint() - startedAt) / 1e9;

      activeRequests.dec();
      requestCount.inc(labels);
      requestDuration.observe(labels, durationSeconds);
    };

    res.once("finish", recordRequest);
    res.once("close", recordRequest);

    next();
  };

  const handler = async (req, res, next) => {
    try {
      if (!safeTokenMatches(readBearerToken(req), config.token)) {
        req.log.warn(
          { event: "metrics_access_denied" },
          "Metrics access denied",
        );
        return res.status(401).json({
          success: false,
          code: "METRICS_ACCESS_DENIED",
          message: "Metrics access denied",
          requestId: req.id,
        });
      }

      const status = runtimeHealth.getStatus();
      dependencyReady.set({ dependency: "mongodb" }, status.databaseReady ? 1 : 0);
      dependencyReady.set(
        { dependency: "rate_limit_store" },
        status.rateLimitStoreReady ? 1 : 0,
      );

      res.setHeader("Content-Type", register.contentType);
      return res.status(200).send(await register.metrics());
    } catch (error) {
      return next(error);
    }
  };

  return {
    handler,
    middleware,
    register,
  };
};
