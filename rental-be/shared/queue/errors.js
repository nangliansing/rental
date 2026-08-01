export class QueueConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "QueueConfigurationError";
  }
}

export class JobValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "JobValidationError";
  }
}

export class UnknownJobHandlerError extends Error {
  constructor(jobName) {
    super(`No handler registered for job "${jobName}"`);
    this.name = "UnknownJobHandlerError";
  }
}
