import { UnknownJobHandlerError } from "../errors.js";

const handlers = new Map();

export const registerJobHandler = (name, handler) => {
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new TypeError("Job handler name must be a non-empty string");
  }

  if (typeof handler !== "function") {
    throw new TypeError("Job handler must be a function");
  }

  handlers.set(name.trim(), handler);
};

export const resolveJobHandler = (name) => {
  if (typeof name !== "string") return undefined;
  return handlers.get(name);
};

export const listRegisteredJobHandlers = () => [...handlers.keys()];

export const createJobHandlerRunner = ({ logger } = {}) => {
  return async (job) => {
    const handler = resolveJobHandler(job.name);

    if (!handler) {
      throw new UnknownJobHandlerError(job.name);
    }

    const startedAt = Date.now();

    try {
      const result = await handler(job);
      logger?.info(
        {
          event: "job_completed",
          jobName: job.name,
          jobId: job.id,
          durationMs: Date.now() - startedAt,
          attemptsMade: job.attemptsMade,
        },
        "Job completed",
      );

      return result ?? { ok: true };
    } catch (error) {
      logger?.error(
        {
          err: error,
          event: "job_failed",
          jobName: job.name,
          jobId: job.id,
          durationMs: Date.now() - startedAt,
          attemptsMade: job.attemptsMade,
        },
        "Job failed",
      );

      throw error;
    }
  };
};

export const clearJobHandlersForTests = () => {
  handlers.clear();
};
