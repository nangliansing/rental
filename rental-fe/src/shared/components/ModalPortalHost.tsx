import {
  createContext,
  useContext,
  type ReactNode,
} from "react"

import { getModalRoot } from "@/shared/utils/getModalRoot"

const ModalPortalHostContext = createContext<HTMLElement | null>(null)

type ModalPortalHostProviderProps = {
  host: HTMLElement | null
  children: ReactNode
}

/**
 * Nest portaled UI (pickers, dialogs, menus) inside an open screen-modal /
 * dialog host so they stack above their parent instead of under `#modal`.
 */
export function ModalPortalHostProvider({
  host,
  children,
}: ModalPortalHostProviderProps) {
  return (
    <ModalPortalHostContext.Provider value={host}>
      {children}
    </ModalPortalHostContext.Provider>
  )
}

export function useModalPortalHost() {
  return useContext(ModalPortalHostContext)
}

/** Prefer an open modal/dialog host so nested overlays stack above their parent. */
export function useModalPortalContainer() {
  return useModalPortalHost() ?? getModalRoot()
}
