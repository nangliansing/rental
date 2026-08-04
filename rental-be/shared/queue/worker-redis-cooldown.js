const RedisFaultMessagePattern =
  /max requests limit exceeded|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ECONNRESET|ENETUNREACH|READONLY|Connection is closed|NR_CLOSED|Stream isn't writeable|connection timeout/i;

export const isRedisWorkerFault = (error) => {
  if (!error) return false;

  const message = String(error.message ?? "");
  if (RedisFaultMessagePattern.test(message)) {
    return true;
  }

  return (
    error.name === "ReplyError" ||
    error.name === "SimpleError" ||
    error.code === "ECONNRESET" ||
    error.code === "ECONNREFUSED" ||
    error.code === "ETIMEDOUT"
  );
};

export const createWorkerRedisCooldown = ({
  worker,
  logger,
  initialDelayMs = 1_000,
  maxDelayMs = 60_000,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) => {
  if (!worker) {
    throw new TypeError("createWorkerRedisCooldown requires a worker");
  }

  let inFlight = null;
  let nextDelayMs = initialDelayMs;

  const reset = () => {
    nextDelayMs = initialDelayMs;
  };

  const schedule = (error) => {
    if (!isRedisWorkerFault(error) || inFlight) {
      return inFlight;
    }

    inFlight = (async () => {
      const delayMs = nextDelayMs;
      nextDelayMs = Math.min(nextDelayMs * 2, maxDelayMs);

      logger?.warn(
        {
          err: error,
          event: "queue_worker_redis_cooldown",
          delayMs,
        },
        "Pausing queue worker after Redis fault",
      );

      try {
        await worker.pause(true);
      } catch (pauseError) {
        logger?.error(
          { err: pauseError, event: "queue_worker_pause_failed" },
          "Failed to pause queue worker during Redis cooldown",
        );
      }

      try {
        await sleep(delayMs);
      } finally {
        try {
          if (!worker.closing) {
            await worker.resume();
            logger?.info(
              { event: "queue_worker_redis_cooldown_resumed", delayMs },
              "Resumed queue worker after Redis cooldown",
            );
          }
        } catch (resumeError) {
          logger?.error(
            { err: resumeError, event: "queue_worker_resume_failed" },
            "Failed to resume queue worker after Redis cooldown",
          );
        } finally {
          inFlight = null;
        }
      }
    })();

    return inFlight;
  };

  return { schedule, reset };
};
