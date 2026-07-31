import type { SearchBuildingFollow } from "@/features/building-follow/api"
import { getBuildingDetailPath } from "@/features/buildings/utils/buildingSummaryDisplay"

export function normalizeFollowedBuildingFollowId(
  follow: SearchBuildingFollow | null | undefined,
): string | null {
  const followId = follow?._id
  if (typeof followId !== "string") return null

  const trimmed = followId.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function getFollowedBuildingLabel(
  follow: SearchBuildingFollow | null | undefined,
): string {
  const buildingName = follow?.building?.name
  if (typeof buildingName === "string") {
    const trimmed = buildingName.trim()
    if (trimmed.length > 0) return trimmed
  }

  const buildingId = follow?.buildingId
  if (typeof buildingId === "string") {
    const trimmed = buildingId.trim()
    if (trimmed.length > 0) return `Building ${trimmed}`
  }

  return "Unavailable building"
}

export function getFollowedBuildingAddress(
  follow: SearchBuildingFollow | null | undefined,
): string | null {
  const address = follow?.building?.address
  if (typeof address !== "string") return null

  const trimmed = address.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function getFollowedBuildingPath(
  follow: SearchBuildingFollow | null | undefined,
): string | null {
  const buildingId = follow?.building?._id ?? follow?.buildingId
  return getBuildingDetailPath(buildingId)
}

export function isRenderableFollowedBuilding(
  follow: SearchBuildingFollow | null | undefined,
): follow is SearchBuildingFollow {
  return normalizeFollowedBuildingFollowId(follow) !== null
}
