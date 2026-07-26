import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

import {
  PROFILE_TAB_CONTENT_TOP_CLASS,
  PROFILE_TAB_PANEL_CLASS,
} from "../utils/profileLayoutStyles"

type ProfileTabPanelProps = {
  children: ReactNode
  className?: string
  withSurface?: boolean
}

export function ProfileTabPanel({
  children,
  className,
  withSurface = true,
}: ProfileTabPanelProps) {
  return (
    <div
      className={cn(
        withSurface ? PROFILE_TAB_PANEL_CLASS : PROFILE_TAB_CONTENT_TOP_CLASS,
        className,
      )}
    >
      {children}
    </div>
  )
}
