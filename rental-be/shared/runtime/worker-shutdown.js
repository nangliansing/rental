export const createWorkerGracefulShutdown = ({
  closeDatabase,
  closeQueueResources,
  logger = console,
  onTimeout = () => process.exit(1),
  timeoutMs,
}) => {
  let shutdownPromise;

  return (reason = "shutdown") => {
    if (shutdownPromise) return shutdownPromise;

    logger.info(
      { event: "worker_shutdown_started", reason },
      "Worker graceful shutdown started",
    );

    shutdownPromise = (async () => {
      const timeout = setTimeout(() => {
        logger.error(
          { event: "worker_shutdown_timeout", timeoutMs },
          "Worker graceful shutdown timed out",
        );
        onTimeout();
      }, timeoutMs);
      timeout.unref?.();

      try {
        const results = await Promise.allSettled([
          closeQueueResources(),
          closeDatabase(),
        ]);

        const errors = results
          .filter((result) => result.status === "rejected")
          .map((result) => result.reason);

        if (errors.length > 0) {
          throw new AggregateError(errors, "One or more worker resources failed to close");
        }

        logger.info(
          { event: "worker_shutdown_completed", reason },
          "Worker graceful shutdown completed",
        );
      } finally {
        clearTimeout(timeout);
      }
    })();

    return shutdownPromise;
  };
};
