import {
  JOB_ID_PATTERN,
  JOB_NAME_PATTERN,
  MAX_JOB_DELAY_MS,
  MAX_JOB_ID_LENGTH,
  MAX_JOB_PRIORITY,
  MIN_JOB_PRIORITY,
} from "./constants.js";
import { JobValidationError } from "./errors.js";

const isPlainObject = (value) => {
  if (value == null || typeof value !== "object") return false;

  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
};

export const validateEnqueueOptions = ({
  name,
  data,
  jobId,
  delayMs,
  priority,
  attempts,
}) => {
  if (typeof name !== "string" || !JOB_NAME_PATTERN.test(name.trim())) {
    throw new JobValidationError(
      "Job name must be a dotted identifier such as system.ping",
    );
  }

  if (!isPlainObject(data)) {
    throw new JobValidationError("Job data must be a plain object");
  }

  if (jobId !== undefined) {
    if (typeof jobId !== "string" || jobId.trim().length === 0) {
      throw new JobValidationError("Job id must be a non-empty string");
    }

    const normalizedJobId = jobId.trim();

    if (!JOB_ID_PATTERN.test(normalizedJobId)) {
      throw new JobValidationError(
        "Job id must use letters, numbers, dots, underscores, or hyphens",
      );
    }

    if (normalizedJobId.length > MAX_JOB_ID_LENGTH) {
      throw new JobValidationError(
        `Job id must be at most ${MAX_JOB_ID_LENGTH} characters`,
      );
    }
  }

  if (delayMs !== undefined) {
    if (
      !Number.isInteger(delayMs) ||
      delayMs < 0 ||
      delayMs > MAX_JOB_DELAY_MS
    ) {
      throw new JobValidationError(
        `Job delay must be an integer from 0 through ${MAX_JOB_DELAY_MS}`,
      );
    }
  }

  if (priority !== undefined) {
    if (
      !Number.isInteger(priority) ||
      priority < MIN_JOB_PRIORITY ||
      priority > MAX_JOB_PRIORITY
    ) {
      throw new JobValidationError(
        `Job priority must be an integer from ${MIN_JOB_PRIORITY} through ${MAX_JOB_PRIORITY}`,
      );
    }
  }

  if (attempts !== undefined) {
    if (!Number.isInteger(attempts) || attempts < 1 || attempts > 10) {
      throw new JobValidationError("Job attempts must be an integer from 1 through 10");
    }
  }

  return {
    name: name.trim(),
    data,
    jobId: jobId?.trim(),
    delayMs,
    priority,
    attempts,
  };
};
