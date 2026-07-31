import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"

import { Button } from "@/components/ui/button"

import {
  AdminDetailPanel as DetailPanel,
  AdminInfoRow as InfoRow,
  AdminStatusBadge as StatusBadge,
  AdminUserCard,
} from "../../components"
import { formatDate } from "../../shared/adminFormatters"
import type { AdminSuspensionListItem } from "../../api"
import {
  getEffectiveSuspensionStatus,
  getSuspensionUserName,
} from "./suspensionDisplayUtils"
import { useSuspensionReview } from "./SuspensionReviewContext"

export function SuspensionDetail({
  suspension,
}: {
  suspension: AdminSuspensionListItem
}) {
  const { isLifting, openLiftDialog } = useSuspensionReview()
  const status = getEffectiveSuspensionStatus(suspension)
  const user = suspension.user
  const createdBy = suspension.createdBy
  const liftedBy = suspension.liftedBy
  const canLift = status !== "LIFTED"

  return (
    <article className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {getSuspensionUserName(suspension)}
            </h2>
            <StatusBadge status={status} />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Suspended {formatDate(suspension.createdAt)}
            {createdBy ? ` by ${createdBy.name}` : ""}
          </p>
        </div>

        {canLift && (
          <Button
            type="button"
            disabled={isLifting}
            className="shrink-0 gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => openLiftDialog(suspension)}
          >
            {isLifting && <LoaderIcon className="h-4 w-4" />}
            Lift suspension
          </Button>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DetailPanel title="Suspended user">
          <AdminUserCard
            name={user?.name ?? "Unknown user"}
            subtitle={user ? `${user.email}` : "No user lookup"}
            meta={user ? `${user.status} · ${user.role}` : undefined}
          />
        </DetailPanel>

        <DetailPanel title="Suspension">
          <InfoRow label="Status" value={status} />
          <InfoRow label="Reason" value={suspension.reason} />
          <InfoRow
            label="Note"
            value={suspension.note?.trim() || "No extra note"}
          />
          <InfoRow label="Starts at" value={formatDate(suspension.startsAt)} />
          <InfoRow label="Expires at" value={formatDate(suspension.expiresAt)} />
        </DetailPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DetailPanel title="Created by">
          {createdBy ? (
            <AdminUserCard
              name={createdBy.name}
              subtitle={createdBy.email}
              meta={`${createdBy.status} · ${createdBy.role}`}
            />
          ) : (
            <p className="text-sm text-slate-500">
              No creator details were found.
            </p>
          )}
        </DetailPanel>

        <DetailPanel title="Lift details">
          <InfoRow
            label="Lifted at"
            value={
              suspension.liftedAt ? formatDate(suspension.liftedAt) : "Not lifted"
            }
          />
          <InfoRow
            label="Lifted by"
            value={
              liftedBy ? `${liftedBy.name} · ${liftedBy.email}` : "Not lifted"
            }
          />
          <InfoRow
            label="Lift reason"
            value={suspension.liftReason?.trim() || "No lift reason"}
          />
        </DetailPanel>
      </div>
    </article>
  )
}
