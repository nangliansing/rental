import { useLocation, useNavigate } from "react-router-dom"

import { useAuth } from "@/features/auth/hooks/useAuth"

import { useOptimisticBuildingFollowToggle } from "../hooks/useOptimisticBuildingFollowToggle"
import { FollowBuildingButton } from "./FollowBuildingButton"

type BuildingFollowControlProps = {
  buildingId: string
  initialIsFollowing: boolean
}

export function BuildingFollowControl({
  buildingId,
  initialIsFollowing,
}: BuildingFollowControlProps) {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const hasActiveAccount = isAuthenticated && user?.status === "ACTIVE"
  const followToggle = useOptimisticBuildingFollowToggle({
    buildingId,
    initialIsFollowing,
    enabled: hasActiveAccount,
  })

  const handleToggle = () => {
    if (!isAuthenticated) {
      const redirect = location.pathname + location.search
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`)
      return
    }

    if (!hasActiveAccount) return

    followToggle.toggle()
  }

  return (
    <FollowBuildingButton
      isFollowing={followToggle.isFollowing}
      isPending={followToggle.isPending}
      settleSignal={followToggle.settleSignal}
      isDisabled={isAuthenticated && !hasActiveAccount}
      onClick={handleToggle}
    />
  )
}
