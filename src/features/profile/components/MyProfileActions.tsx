import { Plus, Settings, Share2 } from "lucide-react"
import { useState } from "react"

import { MAP_SEARCH_LIST_ROOM_PATH } from "@/features/map-search/constants"

import { useMyProfile } from "../context/MyProfileContext"
import { MyProfileSettingsModal } from "./MyProfileSettingsModal"
import { MyProfileShareModal } from "./MyProfileShareModal"

const iconButtonClass =
  "flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-950 hover:bg-slate-200"

export function MyProfileActions() {
  const { profile, logout } = useMyProfile()
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-3 md:justify-start">
      <a
        href="/profile/edit"
        className="flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Edit profile
      </a>

      <a
        href={MAP_SEARCH_LIST_ROOM_PATH}
        className="flex h-11 items-center justify-center gap-2 rounded-full bg-slate-100 px-6 text-sm font-semibold text-slate-950 hover:bg-slate-200"
      >
        <Plus className="h-4 w-4" />
        List a room
      </a>

      <button
        type="button"
        className={iconButtonClass}
        aria-label="Profile settings"
        aria-expanded={isSettingsOpen}
        onClick={() => setIsSettingsOpen(true)}
      >
        <Settings className="h-5 w-5" />
      </button>

      <button
        type="button"
        className={iconButtonClass}
        aria-label="Share profile"
        aria-expanded={isShareOpen}
        onClick={() => setIsShareOpen(true)}
      >
        <Share2 className="h-5 w-5" />
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
