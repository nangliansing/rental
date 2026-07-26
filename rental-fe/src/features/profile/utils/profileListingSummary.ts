export type ProfileListingSummaryCounts = {
  activeCount: number
  pendingCount: number
  rejectedCount: number
}

const EMPTY_LISTING_SUMMARY: ProfileListingSummaryCounts = {
  activeCount: 0,
  pendingCount: 0,
  rejectedCount: 0,
}

function normalizeCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : 0
}

export function normalizeListingSummary(
  summary?: Partial<ProfileListingSummaryCounts> | null,
): ProfileListingSummaryCounts {
  if (!summary) return { ...EMPTY_LISTING_SUMMARY }

  return {
    activeCount: normalizeCount(summary.activeCount),
    pendingCount: normalizeCount(summary.pendingCount),
    rejectedCount: normalizeCount(summary.rejectedCount),
  }
}

export function shouldShowFirstListingPrompt(
  summary: ProfileListingSummaryCounts,
) {
  return summary.activeCount === 0 && summary.pendingCount === 0
}

export function decrementListingSummaryCounts(
  summary: Partial<ProfileListingSummaryCounts> | null | undefined,
  {
    pending = 0,
    rejected = 0,
  }: { pending?: number; rejected?: number } = {},
): ProfileListingSummaryCounts {
  const base = normalizeListingSummary(summary)

  return {
    ...base,
    pendingCount: Math.max(0, base.pendingCount - pending),
    rejectedCount: Math.max(0, base.rejectedCount - rejected),
  }
}
