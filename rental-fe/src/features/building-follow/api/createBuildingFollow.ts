import { ApiError, apiClient } from "@/lib/api-client"

import { parseBuildingFollowResponse } from "./buildingFollowParsers"

export type BuildingFollow = {
  _id: string
  userId: string
  buildingId: string
  createdAt: string
  updatedAt: string
}

export type CreateBuildingFollowInput = {
  buildingId: string
  signal?: AbortSignal
}

type CreateBuildingFollowResponse = {
  success: true
  data: BuildingFollow
}

export async function createBuildingFollow({
  buildingId,
  signal,
}: CreateBuildingFollowInput) {
  const normalizedBuildingId = buildingId.trim()

  if (!normalizedBuildingId) {
    throw new ApiError(
      "Building id is required.",
      422,
      "VALIDATION_ERROR",
    )
  }

  const response = await apiClient.post<CreateBuildingFollowResponse>(
    `/building-follows/${encodeURIComponent(normalizedBuildingId)}`,
    {},
    true,
    signal,
  )

  return parseBuildingFollowResponse(response.data)
}
