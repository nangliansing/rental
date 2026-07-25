const closeHttpServer = (server) => {
  if (!server?.listening) return Promise.resolve();

  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error && error.code !== "ERR_SERVER_NOT_RUNNING") {
        reject(error);
        return;
      }

      resolve();
    });
    server.closeIdleConnections?.();
  });
};

const throwRejectedCleanup = (results) => {
  const errors = results
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason);

  if (errors.length > 0) {
    throw new AggregateError(errors, "One or more resources failed to close");
  }
};

export const createGracefulShutdown = ({
  closeDatabase,
  closeRateLimitStore,
  closeSocketServer,
  logger = console,
  onTimeout = () => process.exit(1),
  runtimeHealth,
  server,
  timeoutMs,
}) => {
  let shutdownPromise;

  return (reason = "shutdown") => {
    if (shutdownPromise) return shutdownPromise;

    runtimeHealth.markShuttingDown();
    logger.info(
      { event: "shutdown_started", reason },
      "Graceful shutdown started",
    );

    shutdownPromise = (async () => {
      const timeout = setTimeout(() => {
        logger.error(
          { event: "shutdown_timeout", timeoutMs },
          "Graceful shutdown timed out",
        );
        server?.closeAllConnections?.();
        onTimeout();
      }, timeoutMs);
      timeout.unref?.();

      try {
        const transportResults = await Promise.allSettled([
          closeHttpServer(server),
          closeSocketServer(),
        ]);

        const dependencyResults = await Promise.allSettled([
          closeDatabase(),
          closeRateLimitStore(),
        ]);
        throwRejectedCleanup([...transportResults, ...dependencyResults]);

        logger.info(
          { event: "shutdown_completed", reason },
          "Graceful shutdown completed",
        );
      } finally {
        clearTimeout(timeout);
      }
    })();

    return shutdownPromise;
  };
};
