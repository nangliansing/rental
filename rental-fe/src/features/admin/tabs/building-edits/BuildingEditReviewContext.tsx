import { createContext, useContext } from "react"

import type { AdminBuildingEditRequest } from "../../api"

export type BuildingEditApproveAction = AdminBuildingEditRequest | null
export type BuildingEditRejectAction = AdminBuildingEditRequest | null

export type BuildingEditReviewContextValue = {
  selectedRequest: AdminBuildingEditRequest | null
  isReviewSubmitting: boolean
  selectRequest: (requestId: string | null) => void
  openApproveDialog: (request: AdminBuildingEditRequest) => void
  openRejectDialog: (request: AdminBuildingEditRequest) => void
  approveAction: BuildingEditApproveAction
  rejectAction: BuildingEditRejectAction
  selectedRejectReason: string
  reviewReason: string
  error: string | null
  setSelectedRejectReason: (value: string) => void
  setReviewReason: (value: string) => void
  closeApproveDialog: () => void
  closeRejectDialog: () => void
  approveEdit: () => void
  rejectEdit: () => void
}

export const BuildingEditReviewContext =
  createContext<BuildingEditReviewContextValue | null>(null)

export function useBuildingEditReview() {
  const context = useContext(BuildingEditReviewContext)

  if (!context) {
    throw new Error(
      "useBuildingEditReview must be used inside BuildingEditsTab",
    )
  }

  return context
}
