import { Button } from "@/components/ui/button"

import {
  AdminDetailPanel as DetailPanel,
  AdminInfoRow as InfoRow,
  AdminListerCard,
  AdminUserCard,
} from "../../components"
import { formatDate } from "../../shared/adminFormatters"
import type { AdminUserDetails } from "../../api"
import { usePlatformAdminReview } from "./PlatformAdminReviewContext"

export function PlatformAdminDetail({
  admin,
  currentUserRole,
}: {
  admin: AdminUserDetails
  currentUserRole?: string
}) {
  const { isSubmitting, openRemoveAdminDialog } = usePlatformAdminReview()
  const canRemoveAdminRole =
    currentUserRole === "OWNER" && admin.role === "ADMIN"

  return (
    <article className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {admin.name}
            </h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {admin.role}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Joined {formatDate(admin.createdAt)}
          </p>
        </div>

        {canRemoveAdminRole && (
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            className="shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => openRemoveAdminDialog(admin)}
          >
            Remove admin
          </Button>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DetailPanel title="Account">
          <AdminUserCard
            name={admin.name}
            subtitle={admin.email}
            meta={`${admin.status} · ${admin.authProvider}`}
          />
        </DetailPanel>

        <DetailPanel title="Access">
          <InfoRow label="Role" value={admin.role} />
          <InfoRow label="Status" value={admin.status} />
          <InfoRow label="Auth provider" value={admin.authProvider} />
          <InfoRow label="Updated at" value={formatDate(admin.updatedAt)} />
        </DetailPanel>
      </div>

      <DetailPanel title="Agent profile">
        {admin.agentProfile ? (
          <AdminListerCard
            name={admin.agentProfile.displayName ?? admin.name}
            subtitle={`${admin.name} · ${admin.email}`}
            meta={`${admin.agentProfile.isOnline ? "ONLINE" : "OFFLINE"} · ${
              admin.agentProfile.isDeleted ? "DELETED" : "VISIBLE"
            }`}
            profile={admin.agentProfile}
          />
        ) : (
          <p className="text-sm text-slate-500">
            This account does not have an agent profile.
          </p>
        )}
      </DetailPanel>
    </article>
  )
}
