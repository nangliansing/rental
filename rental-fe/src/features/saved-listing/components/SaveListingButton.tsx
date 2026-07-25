import { Heart } from "lucide-react"

import { cn } from "@/lib/utils"

type SaveListingButtonProps = {
  isSaved: boolean
  isPending?: boolean
  isDisabled?: boolean
  shouldAnimate?: boolean
  animationKey?: number
  onClick: () => void
}

export function SaveListingButton({
  isSaved,
  isPending = false,
  isDisabled = false,
  shouldAnimate = false,
  animationKey = 0,
  onClick,
}: SaveListingButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-10 shrink-0 touch-manipulation items-center justify-center rounded-full bg-transparent transition-[color,background-color] duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        isSaved ? "text-rose-600 hover:bg-rose-50" : "text-slate-900",
      )}
      aria-pressed={isSaved}
      aria-busy={isPending || undefined}
      aria-label={isSaved ? "Remove saved listing" : "Save listing"}
      disabled={isDisabled}
      onClick={onClick}
    >
      <Heart
        key={animationKey}
        aria-hidden="true"
        className={cn(
          "size-6 transform-gpu transition-[color,fill] duration-150",
          isSaved && "fill-current",
          shouldAnimate && (isSaved ? "save-heart-pop" : "save-heart-unpop"),
        )}
        strokeWidth={2.2}
      />
    </button>
  )
}
