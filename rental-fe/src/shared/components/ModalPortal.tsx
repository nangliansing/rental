import type { ReactNode } from "react"
import { createPortal } from "react-dom"

import { useModalPortalContainer } from "./ModalPortalHost"

type ModalPortalProps = {
  children: ReactNode
}

export function ModalPortal({ children }: ModalPortalProps) {
  const modalRoot = useModalPortalContainer()

  if (!modalRoot) return null

  return createPortal(children, modalRoot)
}
