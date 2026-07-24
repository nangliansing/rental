import type { ComponentType } from "react"
import { ChevronLeft, Home, User } from "lucide-react"
import { NavLink } from "react-router-dom"

import { cn } from "@/lib/utils"
import { useNavigateBack } from "@/shared/hooks/useNavigateBack"
import { useStandalonePageBackContext } from "@/shared/components/navigation/StandalonePageBackContext"

const iconButtonClassName =
  "inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-950 transition-colors hover:bg-slate-100"

function StandaloneIconNavLink({
  to,
  label,
  icon: Icon,
  end = false,
}: {
  to: string
  label: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      aria-label={label}
      title={label}
      className={({ isActive }) =>
        cn(
          iconButtonClassName,
          isActive && "bg-slate-100 text-blue-600",
        )
      }
    >
      <Icon className="h-5 w-5" strokeWidth={2.25} />
    </NavLink>
  )
}

export function StandalonePageHeader() {
  const navigateBack = useNavigateBack("/")
  const backContext = useStandalonePageBackContext()

  const handleBack = () => {
    if (backContext?.backHandler) {
      backContext.backHandler()
      return
    }

    navigateBack()
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <button
          type="button"
          className={cn(iconButtonClassName, "-ml-1")}
          aria-label="Go back"
          onClick={handleBack}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
        </button>

        <div className="flex items-center gap-1">
          <StandaloneIconNavLink
            to="/"
            end
            label="Go to home"
            icon={Home}
          />
          <StandaloneIconNavLink
            to="/profile"
            label="Go to profile"
            icon={User}
          />
        </div>
      </div>
    </header>
  )
}
