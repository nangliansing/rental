import { Button } from "@/components/ui/button"

import {
  AdminBuildingCard,
  AdminDetailPanel as DetailPanel,
  AdminReviewCard,
  AdminStatusBadge as StatusBadge,
  AdminUserCard,
} from "../../components"
import type { AdminBuildingEditRequest } from "../../api"
import { formatDate } from "../../shared/adminFormatters"
import {
  getBuildingEditRequestAgentName,
  getBuildingEditRequestName,
} from "./buildingEditDisplayUtils"
import { useBuildingEditReview } from "./BuildingEditReviewContext"

function BuildingEditRequesterSummary({
  request,
}: {
  request: AdminBuildingEditRequest
}) {
  const agentProfile = request.agentProfile

  return (
    <AdminUserCard
      name={getBuildingEditRequestAgentName(request)}
      subtitle={`${request.requestedBy.name} · ${request.requestedBy.email}`}
      meta={`${request.requestedBy.status} · ${request.requestedBy.role}`}
      photo={agentProfile?.profilePhoto}
      isVerified={agentProfile?.isVerified}
    />
  )
}

export function BuildingEditRequestDetail({
  request,
}: {
  request: AdminBuildingEditRequest
}) {
  const { isReviewSubmitting, openApproveDialog, openRejectDialog } =
    useBuildingEditReview()
  const isPending = request.status === "PENDING"

  return (
    <article className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {getBuildingEditRequestName(request)}
            </h2>
            <StatusBadge status={request.status} />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Requested {formatDate(request.createdAt)} by{" "}
            {getBuildingEditRequestAgentName(request)}
          </p>
        </div>

        {isPending && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isReviewSubmitting}
              onClick={() => openRejectDialog(request)}
            >
              Reject
            </Button>
            <Button
              type="button"
              disabled={isReviewSubmitting}
              onClick={() => openApproveDialog(request)}
            >
              Approve edit
            </Button>
          </div>
        )}
      </div>

      {request.requestReason && (
        <DetailPanel title="Request reason">
          <p className="text-sm leading-6 text-slate-600">
            {request.requestReason}
          </p>
        </DetailPanel>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <DetailPanel title="Current building">
          <AdminBuildingCard building={request.originalBuilding} />
        </DetailPanel>

        <DetailPanel title="Proposed building">
          <AdminBuildingCard
            building={request.proposedBuilding}
            compareTo={request.originalBuilding}
          />
        </DetailPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DetailPanel title="Requester">
          <BuildingEditRequesterSummary request={request} />
        </DetailPanel>

        <DetailPanel title="Review">
          <AdminReviewCard
            status={request.status}
            reviewedAt={
              request.reviewedAt ? formatDate(request.reviewedAt) : null
            }
            reviewedBy={request.reviewedBy?.name}
            noteLabel="Review reason"
            note={request.reviewReason}
          />
        </DetailPanel>
      </div>

      {request.building && (
        <DetailPanel title="Canonical building now">
          <AdminBuildingCard building={request.building} />
        </DetailPanel>
      )}
    </article>
  )
}
