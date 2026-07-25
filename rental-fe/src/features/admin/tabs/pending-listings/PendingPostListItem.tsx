import { AdminReviewListItem } from "../../components"
import type { AdminPendingPost } from "../../api"
import {
  formatCompactBaht,
  formatDate,
} from "../../shared/adminFormatters"
import {
  getAgentName,
  getBuildingName,
  getBuildingType,
  getCoverImage,
  getSubmissionType,
} from "./pendingListingDisplayUtils"
import { usePendingReview } from "./PendingReviewContext"

export function PendingPostListItem({ post }: { post: AdminPendingPost }) {
  const { selectedPost, selectPost } = usePendingReview()
  const coverImage = getCoverImage(post)

  return (
    <AdminReviewListItem
      title={getBuildingName(post)}
      meta={[
        `${getSubmissionType(post)} · ${getBuildingType(post)}`,
        getAgentName(post),
      ]}
      createdAt={formatDate(post.createdAt)}
      isSelected={selectedPost?._id === post._id}
      onSelect={() => selectPost(post._id)}
      image={coverImage}
      imageAlt={post.listing.description ?? getBuildingName(post)}
      imageBadge={`${post.listing.media.length} photos`}
      rightText={formatCompactBaht(post.listing.rent)}
    />
  )
}
