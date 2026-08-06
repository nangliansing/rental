type ExploreOpportunitiesRefreshErrorBannerProps = {
  label: string
  onRetry: () => void
  className?: string
}

export function ExploreOpportunitiesRefreshErrorBanner({
  label,
  onRetry,
  className,
}: ExploreOpportunitiesRefreshErrorBannerProps) {
  return (
    <div
      className={className}
      role="alert"
    >
      <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
        <p className="text-xs font-medium leading-5 text-amber-800">{label}</p>
        <button
          type="button"
          className="shrink-0 text-xs font-semibold text-amber-900 underline-offset-2 hover:underline"
          onClick={onRetry}
        >
          Retry
        </button>
      </div>
    </div>
  )
}
