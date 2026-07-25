import pino from "pino";

const REDACTED = "[REDACTED]";
const REDACT_PATHS = [
  "authorization",
  "cookie",
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "apiSecret",
  "secret",
  "req.headers.authorization",
  "req.headers.cookie",
  "request.headers.authorization",
  "request.headers.cookie",
  "config.jwt.accessSecret",
  "config.jwt.refreshSecret",
  "config.cloudinary.apiSecret",
  "config.metrics.token",
  "*.password",
  "*.token",
  "*.accessToken",
  "*.refreshToken",
];

export const createLogger = ({
  environment = "unknown",
  level = "info",
  serviceName = "rental-be",
  destination,
} = {}) =>
  pino(
    {
      level,
      base: {
        environment,
        service: serviceName,
      },
      redact: {
        paths: REDACT_PATHS,
        censor: REDACTED,
      },
      serializers: {
        err: pino.stdSerializers.err,
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    destination,
  );
