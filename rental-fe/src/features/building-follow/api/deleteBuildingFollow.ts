import { ApiError, apiClient } from "@/lib/api-client"

import type { BuildingFollow } from "./createBuildingFollow"
import { parseBuildingFollowResponse } from "./buildingFollowParsers"

export type DeleteBuildingFollowInput = {
  buildingId: string
  signal?: AbortSignal
}

export function isBuildingFollowNotFoundError(error: unknown) {
  return (
    error instanceof ApiError &&
    (error.code === "BUILDING_FOLLOW_NOT_FOUND" || error.status === 404)
  )
}

export function isBuildingAlreadyFollowedError(error: unknown) {
  return (
    error instanceof ApiError &&
    (error.code === "BUILDING_ALREADY_FOLLOWED" || error.status === 409)
  )
}

export async function deleteBuildingFollow({
  buildingId,
  signal,
}: DeleteBuildingFollowInput): Promise<BuildingFollow> {
  const normalizedBuildingId = buildingId.trim()

  if (!normalizedBuildingId) {
    throw new ApiError(
      "Building id is required.",
      422,
      "VALIDATION_ERROR",
    )
  }

  const response = await apiClient.delete<unknown>(
    `/building-follows/${encodeURIComponent(normalizedBuildingId)}`,
    undefined,
    true,
    signal,
  )

  return parseBuildingFollowResponse(response.data)
}
