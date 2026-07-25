import { useNavigate } from "react-router-dom"

import { useAuth } from "@/features/auth/hooks/useAuth"
import { useMyAgentProfile } from "@/features/profile/api/useMyAgentProfile"

type UseBuildingSummaryActionsOptions = {
  buildingId: string
  hideActions?: boolean
  onListHere?: () => void
  onRequestEdit?: () => void
}

export function useBuildingSummaryActions({
  buildingId,
  hideActions = false,
  onListHere,
  onRequestEdit,
}: UseBuildingSummaryActionsOptions) {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const agentProfileQuery = useMyAgentProfile({
    enabled: isAuthenticated && !isAuthLoading,
  })

  const canManageBuilding =
    !hideActions &&
    buildingId.length > 0 &&
    !isAuthLoading &&
    agentProfileQuery.canCreateListing &&
    !(isAuthenticated && agentProfileQuery.isPending)

  const handleListHere =
    onListHere ??
    (buildingId
      ? () => navigate(`/listings/new?buildingId=${buildingId}`)
      : undefined)

  const handleRequestEdit =
    onRequestEdit ??
    (buildingId
      ? () => navigate(`/buildings/${buildingId}/edit`)
      : undefined)

  const hasManagementActions =
    canManageBuilding && Boolean(handleListHere) && Boolean(handleRequestEdit)

  return {
    canManageBuilding,
    handleListHere,
    handleRequestEdit,
    hasManagementActions,
  }
}
