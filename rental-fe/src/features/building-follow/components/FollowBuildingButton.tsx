import { Bell } from "lucide-react"

import { cn } from "@/lib/utils"

type FollowBuildingButtonProps = {
  isFollowing: boolean
  isPending?: boolean
  isDisabled?: boolean
  onClick: () => void
}

export function FollowBuildingButton({
  isFollowing,
  isPending = false,
  isDisabled = false,
  onClick,
}: FollowBuildingButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-10 shrink-0 touch-manipulation items-center justify-center rounded-full bg-transparent transition-[color,background-color] duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        isFollowing ? "text-sky-600 hover:bg-sky-50" : "text-slate-900",
      )}
      aria-pressed={isFollowing}
      aria-busy={isPending || undefined}
      aria-label={isFollowing ? "Unfollow building" : "Follow building"}
      disabled={isDisabled || isPending}
      onClick={onClick}
    >
      <Bell
        aria-hidden="true"
        className={cn(
          "size-5 transition-[color,fill] duration-150",
          isFollowing && "fill-current",
        )}
        strokeWidth={2.2}
      />
    </button>
  )
}
