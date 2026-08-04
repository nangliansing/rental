import type { ReactNode } from "react"
import { createPortal } from "react-dom"

import { getModalRoot } from "@/shared/utils/getModalRoot"

import { useModalPortalHost } from "./ModalPortalHost"

type ModalPortalProps = {
  children: ReactNode
}

export function ModalPortal({ children }: ModalPortalProps) {
  const nestedHost = useModalPortalHost()
  const modalRoot = nestedHost ?? getModalRoot()

  if (!modalRoot) return null

  return createPortal(children, modalRoot)
}
