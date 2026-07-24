type CollectionRefreshErrorBannerProps = {
  label?: string
  onRetry: () => void
  className?: string
}

export function CollectionRefreshErrorBanner({
  label = "Could not update results. Showing previous results.",
  onRetry,
  className = "mb-2",
}: CollectionRefreshErrorBannerProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ${className}`}
      role="alert"
    >
      <span>{label}</span>
      <button
        type="button"
        className="shrink-0 font-semibold underline"
        onClick={onRetry}
      >
        Retry
      </button>
    </div>
  )
}
