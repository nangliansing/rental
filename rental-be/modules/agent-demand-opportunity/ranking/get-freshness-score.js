const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export const getFreshnessScore = (confirmedAt, now, policy) => {
  const timestamp = new Date(confirmedAt).getTime();
  if (!Number.isFinite(timestamp)) return 0;

  const ageDays = Math.max(0, (now.getTime() - timestamp) / MILLISECONDS_PER_DAY);
  return policy.freshnessBands.find((band) => ageDays <= band.maximumAgeDays)?.score ?? 0;
};
