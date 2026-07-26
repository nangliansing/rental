import { Plus, Settings, Share2 } from "lucide-react"
import { useState } from "react"

import { MAP_SEARCH_LIST_ROOM_PATH } from "@/features/map-search/constants"

import { useMyProfile } from "../context/MyProfileContext"
import {
  PROFILE_ACTIONS_ROW_CLASS,
  PROFILE_ICON_BUTTON_CLASS,
  PROFILE_PRIMARY_ACTION_CLASS,
} from "../utils/profileLayoutStyles"
import { MyProfileSettingsModal } from "./MyProfileSettingsModal"
import { MyProfileShareModal } from "./MyProfileShareModal"

export function MyProfileActions() {
  const { profile, logout } = useMyProfile()
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <div className={PROFILE_ACTIONS_ROW_CLASS}>
      <a href={MAP_SEARCH_LIST_ROOM_PATH} className={PROFILE_PRIMARY_ACTION_CLASS}>
        <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
        List a room
      </a>

      <button
        type="button"
        className={PROFILE_ICON_BUTTON_CLASS}
        aria-label="Profile settings"
        aria-expanded={isSettingsOpen}
        onClick={() => setIsSettingsOpen(true)}
      >
        <Settings className="h-5 w-5" aria-hidden="true" />
      </button>

      <button
        type="button"
        className={PROFILE_ICON_BUTTON_CLASS}
        aria-label="Share profile"
        aria-expanded={isShareOpen}
        onClick={() => setIsShareOpen(true)}
      >
        <Share2 className="h-5 w-5" aria-hidden="true" />
      </button>

      {isShareOpen && (
        <MyProfileShareModal profile={profile} onClose={() => setIsShareOpen(false)} />
      )}

      {isSettingsOpen && (
        <MyProfileSettingsModal
          isLoggingOut={logout.isLoggingOut}
          logoutError={logout.error}
          onClose={() => setIsSettingsOpen(false)}
          onLogout={logout.logout}
          onLogoutReset={logout.reset}
        />
      )}
    </div>
  )
}
