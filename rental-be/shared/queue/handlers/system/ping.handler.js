export const handleSystemPingJob = async (job) => {
  const message =
    typeof job.data?.message === "string" && job.data.message.trim().length > 0
      ? job.data.message.trim()
      : "pong";

  return {
    ok: true,
    message,
    processedAt: new Date().toISOString(),
    attempt: job.attemptsMade + 1,
  };
};
