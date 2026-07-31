import { ActiveToggleCircleButton } from "@/shared/components/toggle/ActiveToggleCircleButton"

type FollowBuildingButtonProps = {
  isFollowing: boolean
  isPending?: boolean
  isDisabled?: boolean
  settleSignal?: number
  onClick: () => void
}

export function FollowBuildingButton({
  isFollowing,
  isPending = false,
  isDisabled = false,
  settleSignal = 0,
  onClick,
}: FollowBuildingButtonProps) {
  return (
    <ActiveToggleCircleButton
      isActive={isFollowing}
      isPending={isPending}
      isDisabled={isDisabled}
      settleSignal={settleSignal}
      activeLabel="Unfollow building"
      inactiveLabel="Follow building"
      onClick={onClick}
    />
  )
}
