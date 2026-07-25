import type { ReactNode } from "react"
import { ChevronLeft, Search, User } from "lucide-react"
import { NavLink } from "react-router-dom"

import { useAuth } from "@/features/auth/hooks/useAuth"
import { useMyAgentProfile } from "@/features/profile/api"
import { cn } from "@/lib/utils"
import { Avatar } from "@/shared/components/data-display/Avatar"
import { useNavigateBack } from "@/shared/hooks/useNavigateBack"
import { useStandalonePageBackContext } from "@/shared/components/navigation/StandalonePageBackContext"

const BACK_BUTTON_CLASSNAME =
  "inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-950 shadow-sm ring-1 ring-slate-200/80 transition hover:bg-slate-50"

const ACTION_PILL_CLASSNAME =
  "inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-white p-1 shadow-lg"

const ACTION_PILL_LINK_CLASSNAME =
  "flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition"

function StandaloneNavPillLink({
  to,
  label,
  text,
  end = false,
  children,
}: {
  to: string
  label: string
  text: string
  end?: boolean
  children: ReactNode
}) {
  return (
    <NavLink
      to={to}
      end={end}
      aria-label={label}
      title={label}
      className={({ isActive }) =>
        cn(
          ACTION_PILL_LINK_CLASSNAME,
          isActive
            ? "bg-slate-950 text-white"
            : "text-slate-600 hover:bg-slate-100",
        )
      }
    >
      {children}
      <span>{text}</span>
    </NavLink>
  )
}

function StandaloneProfilePillLink({
  displayName,
  photo,
}: {
  displayName?: string | null
  photo?: { secureUrl?: string | null; alt?: string | null } | null
}) {
  const hasPhoto = Boolean(photo?.secureUrl)

  return (
    <NavLink
      to="/profile"
      aria-label="Go to profile"
      title="Go to profile"
      className={({ isActive }) =>
        cn(
          ACTION_PILL_LINK_CLASSNAME,
          isActive
            ? "bg-slate-950 text-white"
            : "text-slate-600 hover:bg-slate-100",
        )
      }
    >
      {hasPhoto ? (
        <Avatar
          displayName={displayName}
          photo={photo}
          size="xs"
          className={cn(
            "h-5 w-5",
            photo?.secureUrl ? "ring-0" : undefined,
          )}
        />
      ) : (
        <User aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
      )}
      <span>Profile</span>
    </NavLink>
  )
}

export function StandalonePageHeader() {
  const navigateBack = useNavigateBack("/")
  const backContext = useStandalonePageBackContext()
  const { isAuthenticated } = useAuth()
  const agentProfileQuery = useMyAgentProfile({
    enabled: isAuthenticated,
  })
  const profile = agentProfileQuery.data

  const handleBack = () => {
    if (backContext?.backHandler) {
      backContext.backHandler()
      return
    }

    navigateBack()
  }

  return (
    <header className="sticky top-0 z-50 px-4 pt-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <button
          type="button"
          className={BACK_BUTTON_CLASSNAME}
          aria-label="Go back"
          onClick={handleBack}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
        </button>

        <nav aria-label="Standalone page actions" className={ACTION_PILL_CLASSNAME}>
          <StandaloneNavPillLink to="/" end label="Search rentals" text="Search">
            <Search aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
          </StandaloneNavPillLink>

          <StandaloneProfilePillLink
            displayName={profile?.displayName}
            photo={profile?.profilePhoto}
          />
        </nav>
      </div>
    </header>
  )
}
