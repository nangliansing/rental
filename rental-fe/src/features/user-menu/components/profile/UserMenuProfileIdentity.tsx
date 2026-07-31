import type { ReactNode } from "react"

import type { AuthUser } from "@/features/auth/types"
import { Avatar } from "@/shared/components/data-display/Avatar"

import {
  getUserMenuDisplayName,
  getUserMenuEmail,
} from "../../utils/userMenuDisplay"

type UserMenuProfileIdentityProps = {
  user: AuthUser
  actions?: ReactNode
}

export function UserMenuProfileIdentity({
  user,
  actions,
}: UserMenuProfileIdentityProps) {
  const displayName = getUserMenuDisplayName(user.name)
  const email = getUserMenuEmail(user.email)

  return (
    <div className="flex items-center gap-3">
      <Avatar
        displayName={displayName}
        photo={user.profilePhoto}
        colorKey={user._id}
        size="md"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="min-w-0 flex-1 truncate text-base font-semibold text-slate-950">
            {displayName}
          </p>
          {actions}
        </div>
        {email ? (
          <p className="truncate text-sm font-medium text-slate-500">{email}</p>
        ) : null}
      </div>
    </div>
  )
}
