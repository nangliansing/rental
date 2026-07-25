import { createContext, useContext } from "react"

import type { AdminSuspensionListItem } from "../../api"

export type LiftSuspensionAction = AdminSuspensionListItem | null

export type SuspensionReviewContextValue = {
  selectedSuspension: AdminSuspensionListItem | null
  liftAction: LiftSuspensionAction
  liftReason: string
  liftNote: string
  liftError: string | null
  isLifting: boolean
  selectSuspension: (suspensionId: string | null) => void
  openLiftDialog: (suspension: AdminSuspensionListItem) => void
  closeLiftDialog: () => void
  setLiftReason: (value: string) => void
  setLiftNote: (value: string) => void
  confirmLiftSuspension: () => void
}

export const SuspensionReviewContext =
  createContext<SuspensionReviewContextValue | null>(null)

export function useSuspensionReview() {
  const context = useContext(SuspensionReviewContext)

  if (!context) {
    throw new Error(
      "useSuspensionReview must be used inside SuspensionsTab",
    )
  }

  return context
}
