import type { RefObject } from "react"

import { useAuth } from "@/features/auth/hooks/useAuth"

import { UserMenuFollowedBuildingsSection } from "./followed-buildings/UserMenuFollowedBuildingsSection"
import { UserMenuProfileSection } from "./profile/UserMenuProfileSection"
import { UserMenuSignedOutState } from "./UserMenuSignedOutState"
import { isUserMenuAuthUser } from "../utils/userMenuDisplay"

type UserMenuPanelProps = {
  enabled?: boolean
  onClose?: () => void
  rootRef?: RefObject<HTMLDivElement | null>
}

export function UserMenuPanel({
  enabled = true,
  onClose,
  rootRef,
}: UserMenuPanelProps) {
  const { user } = useAuth()

  if (!isUserMenuAuthUser(user)) {
    return <UserMenuSignedOutState />
  }

  const handleNavigate = () => {
    onClose?.()
  }

  return (
    <div className="flex min-h-full flex-col">
      <UserMenuProfileSection user={user} onNavigate={handleNavigate} />

      <UserMenuFollowedBuildingsSection
        userId={user._id}
        enabled={enabled}
        rootRef={rootRef}
        onNavigate={handleNavigate}
      />
    </div>
  )
}
