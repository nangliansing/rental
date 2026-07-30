import { ApiError } from "@/lib/api-client"

import {
  normalizePositiveInteger,
  parsePagination,
  parseSearchListingsBuilding,
  readRecord,
  readString,
} from "@/features/listing/api/listingResponseParsers"
import type {
  Pagination,
  SearchListingsBuilding,
} from "@/features/map-search/types"

import type { BuildingFollow } from "./createBuildingFollow"

export { normalizePositiveInteger }

export type SearchBuildingFollow = Omit<BuildingFollow, "userId"> & {
  building: SearchListingsBuilding | null
}

export type SearchUserBuildingFollowsResponse = {
  success: true
  data: {
    followings: SearchBuildingFollow[]
  }
  pagination: Pagination
}

export const parseBuildingFollow = (value: unknown): BuildingFollow => {
  const follow = readRecord(value)
  const id = readString(follow._id)
  const userId = readString(follow.userId)
  const buildingId = readString(follow.buildingId)

  if (!id || !userId || !buildingId) {
    throw new ApiError(
      "Building follow response is missing required data.",
      500,
      "INVALID_BUILDING_FOLLOW_RESPONSE",
    )
  }

  return {
    _id: id,
    userId,
    buildingId,
    createdAt: readString(follow.createdAt),
    updatedAt: readString(follow.updatedAt),
  }
}

export const parseBuildingFollowResponse = (value: unknown) => {
  const body = readRecord(value)

  if (body.success !== true) {
    throw new ApiError(
      "Building follow response is missing required data.",
      500,
      "INVALID_BUILDING_FOLLOW_RESPONSE",
    )
  }

  return parseBuildingFollow(body.data)
}

export const parseSearchBuildingFollow = (
  value: unknown,
): SearchBuildingFollow => {
  const follow = readRecord(value)
  const id = readString(follow._id)
  const buildingId = readString(follow.buildingId)

  if (!id || !buildingId) {
    throw new ApiError(
      "Building follow response is missing required data.",
      500,
      "INVALID_BUILDING_FOLLOW_RESPONSE",
    )
  }

  return {
    _id: id,
    buildingId,
    createdAt: readString(follow.createdAt),
    updatedAt: readString(follow.updatedAt),
    building:
      follow.building === null || follow.building === undefined
        ? null
        : parseSearchListingsBuilding(follow.building, {
            errorMessage:
              "Building follow response is missing building data.",
            errorCode: "INVALID_BUILDING_FOLLOW_RESPONSE",
          }),
  }
}

export const parseSearchUserBuildingFollowsResponse = (
  value: unknown,
  fallback: { page: number; limit: number },
): SearchUserBuildingFollowsResponse => {
  const body = readRecord(value)
  const data = readRecord(body.data)
  const followings = data.followings

  if (body.success !== true || !Array.isArray(followings)) {
    throw new ApiError(
      "Building follows response is missing required data.",
      500,
      "INVALID_BUILDING_FOLLOW_RESPONSE",
    )
  }

  return {
    success: true,
    data: {
      followings: followings.map(parseSearchBuildingFollow),
    },
    pagination: parsePagination(body.pagination, fallback),
  }
}
