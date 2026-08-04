import {
  createContext,
  useContext,
  type ReactNode,
} from "react"

const ModalPortalHostContext = createContext<HTMLElement | null>(null)

type ModalPortalHostProviderProps = {
  host: HTMLElement | null
  children: ReactNode
}

/**
 * Nest portaled UI (pickers, screen modals) inside an open dialog content node
 * so Radix does not treat them as outside / non-interactive siblings.
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
