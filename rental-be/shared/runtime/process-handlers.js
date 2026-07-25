export const registerProcessHandlers = ({
  logger = console,
  processRef = process,
  shutdown,
}) => {
  let requestedExitCode = 0;

  const runShutdown = (reason, exitCode) => {
    requestedExitCode = Math.max(requestedExitCode, exitCode);

    void shutdown(reason)
      .then(() => {
        processRef.exitCode = requestedExitCode;
      })
      .catch((error) => {
        logger.error(
          { err: error, event: "shutdown_failed" },
          "Graceful shutdown failed",
        );
        processRef.exitCode = 1;
      });
  };

  const handlers = {
    SIGINT: () => runShutdown("SIGINT", 0),
    SIGTERM: () => runShutdown("SIGTERM", 0),
    uncaughtException: (error) => {
      logger.error(
        { err: error, event: "uncaught_exception" },
        "Uncaught exception",
      );
      runShutdown("uncaughtException", 1);
    },
    unhandledRejection: (reason) => {
      logger.error(
        {
          event: "unhandled_rejection",
          ...(reason instanceof Error
            ? { err: reason }
            : { reason: String(reason) }),
        },
        "Unhandled promise rejection",
      );
      runShutdown("unhandledRejection", 1);
    },
  };

  for (const [eventName, handler] of Object.entries(handlers)) {
    processRef.once(eventName, handler);
  }

  return () => {
    for (const [eventName, handler] of Object.entries(handlers)) {
      processRef.off(eventName, handler);
    }
  };
};
