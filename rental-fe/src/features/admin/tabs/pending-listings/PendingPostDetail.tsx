import { Button } from "@/components/ui/button"
import { ListingCoverImage } from "@/features/listing/components/ListingPresentationPrimitives"

import {
  AdminBuildingCard,
  AdminDetailPanel as DetailPanel,
  AdminListingCard,
} from "../../components"
import type { AdminPendingPost } from "../../api"
import { AdminSectionTitle } from "../../components/AdminSectionTitle"
import { formatDate } from "../../shared/adminFormatters"
import {
  getAgentName,
  getBuildingAddress,
  getBuildingName,
  getBuildingType,
  getSubmissionType,
} from "./pendingListingDisplayUtils"
import { PendingPostListerPanel } from "./PendingPostListerCard"
import { usePendingReview } from "./PendingReviewContext"

export function PendingPostDetail({
  post,
  onSuspendUser,
}: {
  post: AdminPendingPost
  onSuspendUser: (target: { userId: string; name: string }) => void
}) {
  const { isReviewSubmitting, openApproveDialog, openRejectDialog } =
    usePendingReview()
  const location = post.existingBuilding?.location ?? post.building?.location
  const buildingSummary = {
    name: getBuildingName(post),
    buildingType: getBuildingType(post),
    address: getBuildingAddress(post),
    location,
    facilities:
      post.existingBuilding?.facilities ?? post.building?.facilities ?? [],
    security: post.existingBuilding?.security ?? post.building?.security ?? [],
  }
  const isPending = post.status === "PENDING"

  return (
    <article className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {getBuildingName(post)}
            </h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {getSubmissionType(post)}
            </span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              {post.status}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Submitted {formatDate(post.createdAt)} by {getAgentName(post)}
          </p>
        </div>

        {isPending && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isReviewSubmitting}
              onClick={() => openRejectDialog(post)}
            >
              Reject
            </Button>
            <Button
              type="button"
              disabled={isReviewSubmitting}
              onClick={() => openApproveDialog(post)}
            >
              Approve
            </Button>
          </div>
        )}
      </div>

      <section>
        <AdminSectionTitle
          title="Photos"
          detail={`${post.listing.media.length} uploaded`}
        />
        <div className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-3">
          {post.listing.media.map((media, index) => (
            <div
              key={media.publicId}
              className="relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100"
            >
              <ListingCoverImage
                photo={media}
                altFallback={`Listing photo ${index + 1}`}
                fallbackClassName="text-slate-400"
              />
              <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-slate-800">
                {index + 1}/{post.listing.media.length}
              </span>
              {media.isCover && (
                <span className="absolute bottom-2 left-2 rounded-full bg-slate-950/85 px-2 py-0.5 text-xs font-semibold text-white">
                  Cover
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <DetailPanel title="Building">
          <AdminBuildingCard building={buildingSummary} />
        </DetailPanel>

        <PendingPostListerPanel
          name={getAgentName(post)}
          subtitle={
            post.submittedBy
              ? `${post.submittedBy.name} · ${post.submittedBy.email}`
              : "The submitting account no longer exists"
          }
          meta={
            post.submittedBy
              ? `${post.submittedBy.status} · ${post.submittedBy.role}`
              : "ACCOUNT UNAVAILABLE"
          }
          profile={post.agentProfile}
          userId={post.submittedBy?._id}
          userStatus={post.submittedBy?.status}
          onSuspendUser={onSuspendUser}
        />
      </div>

      <DetailPanel title="Listing">
        <AdminListingCard listing={post.listing} />
      </DetailPanel>
    </article>
  )
}
