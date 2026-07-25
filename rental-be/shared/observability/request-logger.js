import {
  isQuietOperationalPath,
  normalizeHttpPath,
} from "./http-path.js";

const getLogLevel = (statusCode) => {
  if (statusCode >= 500) return "error";
  if (statusCode >= 400) return "warn";
  return "info";
};

export const createRequestLoggerMiddleware = () => (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.once("finish", () => {
    if (isQuietOperationalPath(req.path)) return;

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const level = getLogLevel(res.statusCode);

    req.log[level](
      {
        event: "http_request_completed",
        durationMs: Number(durationMs.toFixed(3)),
        method: req.method,
        route: normalizeHttpPath(req),
        statusCode: res.statusCode,
        ...(req.user?.id ? { userId: req.user.id } : {}),
      },
      "HTTP request completed",
    );
  });

  next();
};
