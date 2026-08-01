import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"
import { cn } from "@/lib/utils"

type BuildingUnfollowButtonProps = {
  subjectLabel: string
  isUnfollowing?: boolean
  disabled?: boolean
  onClick: () => void
  className?: string
}

export function BuildingUnfollowButton({
  subjectLabel,
  isUnfollowing = false,
  disabled = false,
  onClick,
  className,
}: BuildingUnfollowButtonProps) {
  const isDisabled = disabled || isUnfollowing

  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
        "text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      aria-label={`Unfollow ${subjectLabel}`}
      disabled={isDisabled}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        if (isDisabled) return
        onClick()
      }}
    >
      {isUnfollowing ? (
        <LoaderIcon aria-hidden="true" className="h-3.5 w-3.5" />
      ) : null}
      Unfollow
    </button>
  )
}
