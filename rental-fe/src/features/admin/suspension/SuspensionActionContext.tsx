import { createContext, useContext } from "react"

export type SuspensionActionTarget = {
  userId: string
  name: string
}

export type SuspensionActionContextValue = {
  openSuspensionDialog: (target: SuspensionActionTarget) => void
}

export const SuspensionActionContext =
  createContext<SuspensionActionContextValue | null>(null)

export function useSuspensionAction() {
  const context = useContext(SuspensionActionContext)

  if (!context) {
    throw new Error(
      "useSuspensionAction must be used inside SuspensionActionProvider",
    )
  }

  return context
}
