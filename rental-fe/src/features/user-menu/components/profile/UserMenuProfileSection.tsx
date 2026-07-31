import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"

import type { AuthUser } from "@/features/auth/types"
import { cn } from "@/lib/utils"

import { UserMenuProfileActionsMenu } from "./UserMenuProfileActionsMenu"
import { UserMenuProfileIdentity } from "./UserMenuProfileIdentity"

type UserMenuProfileSectionProps = {
  user: AuthUser
  className?: string
  onNavigate?: () => void
}

export function UserMenuProfileSection({
  user,
  className,
  onNavigate,
}: UserMenuProfileSectionProps) {
  return (
    <section
      aria-label="Account profile"
      className={cn("shrink-0 border-b border-slate-100 px-5 py-4", className)}
    >
      <UserMenuProfileIdentity
        user={user}
        actions={<UserMenuProfileActionsMenu onNavigate={onNavigate} />}
      />

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
        <Link
          to="/profile"
          className="inline-flex items-center gap-1 text-slate-600 transition hover:text-slate-950"
          onClick={onNavigate}
        >
          View profile
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}
