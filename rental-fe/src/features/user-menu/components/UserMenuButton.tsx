import { lazy, Suspense, useRef } from "react"

import { useAuth } from "@/features/auth/hooks/useAuth"
import { Avatar } from "@/shared/components/data-display/Avatar"
import { FloatingActionPanel } from "@/shared/components/navigation/FloatingActionPanel"
import { getFloatingActionPanelTriggerClassName } from "@/shared/components/navigation/floatingActionPanelTrigger"
import { useFloatingActionPanel } from "@/shared/hooks/useFloatingActionPanel"

import { getUserMenuDisplayName } from "../utils/userMenuDisplay"
import { UserMenuPanelFallback } from "./UserMenuPanelFallback"

const UserMenuPanel = lazy(async () => ({
  default: (await import("./UserMenuPanel")).UserMenuPanel,
}))

type UserMenuButtonProps = {
  variant: "desktop" | "mobile"
}

export function UserMenuButton({ variant }: UserMenuButtonProps) {
  const { user } = useAuth()
  const { isOpen, isVisible, togglePanel, closePanel } = useFloatingActionPanel()
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const displayName = getUserMenuDisplayName(user?.name)

  return (
    <>
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={getFloatingActionPanelTriggerClassName(variant, isOpen)}
        onClick={togglePanel}
      >
        <Avatar
          displayName={displayName}
          colorKey={user?._id}
          size="xs"
        />
        {variant === "mobile" && <span>Account</span>}
      </button>

      {isOpen && (
        <FloatingActionPanel
          variant={variant}
          isVisible={isVisible}
          title="Account"
          subtitle="Profile and followed buildings"
          closeLabel="Close account menu"
          bodyRef={scrollRef}
          onClose={closePanel}
        >
          <Suspense fallback={<UserMenuPanelFallback />}>
            <UserMenuPanel
              enabled={isOpen}
              onClose={closePanel}
              rootRef={scrollRef}
            />
          </Suspense>
        </FloatingActionPanel>
      )}
    </>
  )
}
