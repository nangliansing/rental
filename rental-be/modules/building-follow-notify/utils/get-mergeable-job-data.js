import { getQueue, isQueueEnabled } from "../../../shared/queue/queue-manager.js";

const UPDATABLE_JOB_STATES = new Set(["delayed", "waiting", "paused"]);

export const getMergeableJobData = async (jobId) => {
  if (!isQueueEnabled() || !jobId) {
    return null;
  }

  try {
    const job = await getQueue().getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();

    if (!UPDATABLE_JOB_STATES.has(state)) {
      return null;
    }

    return job.data ?? null;
  } catch {
    return null;
  }
};
