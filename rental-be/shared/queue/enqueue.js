import { validateEnqueueOptions } from "./validate-enqueue-options.js";
import { getQueue, isQueueEnabled } from "./queue-manager.js";

const UPDATABLE_JOB_STATES = new Set(["delayed", "waiting", "paused"]);
const TERMINAL_JOB_STATES = new Set(["completed", "failed"]);

const addOrUpdateDelayedJob = async (queue, validated) => {
  const addOptions = {
    jobId: validated.jobId,
    delay: validated.delayMs,
    priority: validated.priority,
    attempts: validated.attempts,
  };

  if (!validated.jobId) {
    return {
      job: await queue.add(validated.name, validated.data, addOptions),
      updated: false,
    };
  }

  const existingJob = await queue.getJob(validated.jobId);
  if (!existingJob) {
    return {
      job: await queue.add(validated.name, validated.data, addOptions),
      updated: false,
    };
  }

  const state = await existingJob.getState();
  if (TERMINAL_JOB_STATES.has(state)) {
    await existingJob.remove();

    return {
      job: await queue.add(validated.name, validated.data, addOptions),
      updated: false,
    };
  }

  if (!UPDATABLE_JOB_STATES.has(state)) {
    return {
      job: existingJob,
      updated: false,
      skipped: true,
      reason: "job_active",
    };
  }

  await existingJob.updateData(validated.data);

  if (validated.delayMs !== undefined) {
    await existingJob.changeDelay(validated.delayMs);
  }

  if (validated.priority !== undefined) {
    await existingJob.changePriority({ priority: validated.priority });
  }

  return {
    job: existingJob,
    updated: true,
  };
};

export const enqueueJob = async ({
  name,
  data = {},
  jobId,
  delayMs,
  priority,
  attempts,
}) => {
  const validated = validateEnqueueOptions({
    name,
    data,
    jobId,
    delayMs,
    priority,
    attempts,
  });

  if (!isQueueEnabled()) {
    return {
      enqueued: false,
      reason: "disabled",
      name: validated.name,
    };
  }

  const queue = getQueue();
  const { job, updated, skipped, reason } = await addOrUpdateDelayedJob(queue, validated);

  if (skipped) {
    return {
      enqueued: false,
      reason,
      name: validated.name,
      jobId: job.id,
    };
  }

  return {
    enqueued: true,
    updated,
    name: validated.name,
    jobId: job.id,
    delayMs: validated.delayMs ?? 0,
  };
};
