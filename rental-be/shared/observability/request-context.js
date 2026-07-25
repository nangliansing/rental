import { AsyncLocalStorage } from "node:async_hooks";
import crypto from "node:crypto";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const requestContext = new AsyncLocalStorage();

const readRequestId = (req) => {
  const value = req.get("x-request-id");
  return typeof value === "string" && REQUEST_ID_PATTERN.test(value)
    ? value
    : crypto.randomUUID();
};

export const createRequestContextMiddleware = ({ logger }) =>
  (req, res, next) => {
    const requestId = readRequestId(req);
    const requestLogger = logger.child({ requestId });

    req.id = requestId;
    req.log = requestLogger;
    res.setHeader("X-Request-ID", requestId);

    requestContext.run(
      {
        requestId,
        logger: requestLogger,
      },
      next,
    );
  };

export const getRequestContext = () => requestContext.getStore();

export const getRequestLogger = (req, fallbackLogger) =>
  req?.log || requestContext.getStore()?.logger || fallbackLogger;
