import type { AdminPendingPost } from "../../api"

export function getCoverImage(post: AdminPendingPost) {
  return (
    post.listing.media.find((media) => media.isCover) ?? post.listing.media[0]
  )
}

export function getBuildingName(post: AdminPendingPost) {
  return post.existingBuilding?.name ?? post.building?.name ?? "New building"
}

export function getBuildingType(post: AdminPendingPost) {
  return (
    post.existingBuilding?.buildingType ??
    post.building?.buildingType ??
    "Building"
  )
}

export function getBuildingAddress(post: AdminPendingPost) {
  return (
    post.existingBuilding?.address ?? post.building?.address ?? "No address"
  )
}

export function getSubmissionType(post: AdminPendingPost) {
  return post.existingBuildingId ? "Existing building" : "New building"
}

export function getAgentName(post: AdminPendingPost) {
  return (
    post.agentProfile?.displayName ??
    post.submittedBy?.name ??
    "Unknown submitter"
  )
}
