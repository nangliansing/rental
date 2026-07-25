import type { ReactNode } from "react"

import type { UploadedMedia } from "@/features/uploads"
import { Avatar } from "@/shared/components/data-display/Avatar"

import { AdminVerifiedBadge } from "./AdminVerifiedBadge"

export function AdminUserCard({
  name,
  subtitle,
  meta,
  photo,
  colorKey,
  isVerified,
  action,
  children,
}: {
  name: string
  subtitle?: string
  meta?: string
  photo?: UploadedMedia | null
  colorKey?: string | null
  isVerified?: boolean
  action?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Avatar
          displayName={name}
          photo={photo}
          colorKey={colorKey ?? name}
          size="xl"
        />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="truncate text-base font-semibold text-slate-950">
              {name}
            </p>
            {isVerified && <AdminVerifiedBadge />}
          </div>
          {subtitle && (
            <p className="mt-0.5 truncate text-sm text-slate-500">
              {subtitle}
            </p>
          )}
          {meta && (
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              {meta}
            </p>
          )}
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      {children}
    </div>
  )
}
