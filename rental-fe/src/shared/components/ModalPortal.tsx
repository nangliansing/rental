import type { ReactNode } from "react"
import { createPortal } from "react-dom"

import { getModalRoot } from "@/shared/utils/getModalRoot"

type ModalPortalProps = {
  children: ReactNode
}

export function ModalPortal({ children }: ModalPortalProps) {
  const modalRoot = getModalRoot()

  if (!modalRoot) return null

  return createPortal(children, modalRoot)
}
