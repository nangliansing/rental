import { ApiError } from "@/lib/api-client"

import {
  normalizePositiveInteger,
  parseListingMedia,
  parseSearchListingsBuilding,
  readBoolean,
  readRecord,
  readString,
} from "@/features/listing/api/listingResponseParsers"
import type {
  ListingMedia,
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

export type BuildingFollowerUser = {
  _id: string
  name: string | null
  displayName: string | null
  profilePhoto: ListingMedia | null
  isVerified: boolean | undefined
}

export type SearchBuildingFollower = {
  _id: string
  userId: string
  buildingId: string
  createdAt: string | undefined
  updatedAt: string | undefined
  user: BuildingFollowerUser | null
}

export type SearchBuildingFollowersResponse = {
  success: true
  data: {
    followers: SearchBuildingFollower[]
  }
  pagination: Pagination
}

const invalidBuildingFollowResponse = () =>
  new ApiError(
    "Building follow response is missing required data.",
    500,
    "INVALID_BUILDING_FOLLOW_RESPONSE",
  )

const parseSearchPagination = (
  value: unknown,
  expected: { page: number; limit: number },
): Pagination => {
  const pagination = readRecord(value)
  const page = pagination.page
  const limit = pagination.limit
  const total = pagination.total

  if (
    !Number.isInteger(page) ||
    !Number.isInteger(limit) ||
    !Number.isInteger(total) ||
    page !== expected.page ||
    limit !== expected.limit ||
    (total as number) < 0
  ) {
    throw invalidBuildingFollowResponse()
  }

  return {
    page: page as number,
    limit: limit as number,
    total: total as number,
  }
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
    pagination: parseSearchPagination(body.pagination, fallback),
  }
}

export const parseBuildingFollowerUser = (
  value: unknown,
): BuildingFollowerUser | null => {
  if (value === null || value === undefined) return null

  const user = readRecord(value)
  const id = readString(user._id)

  if (!id) return null

  return {
    _id: id,
    name: readString(user.name),
    displayName: readString(user.displayName),
    profilePhoto: parseListingMedia(user.profilePhoto),
    isVerified: readBoolean(user.isVerified),
  }
}

export const parseSearchBuildingFollower = (
  value: unknown,
): SearchBuildingFollower => {
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
    user: parseBuildingFollowerUser(follow.user),
  }
}

export const parseSearchBuildingFollowersResponse = (
  value: unknown,
  fallback: { page: number; limit: number },
): SearchBuildingFollowersResponse => {
  const body = readRecord(value)
  const data = readRecord(body.data)
  const followers = data.followers

  if (body.success !== true || !Array.isArray(followers)) {
    throw new ApiError(
      "Building followers response is missing required data.",
      500,
      "INVALID_BUILDING_FOLLOW_RESPONSE",
    )
  }

  return {
    success: true,
    data: {
      followers: followers.map(parseSearchBuildingFollower),
    },
    pagination: parseSearchPagination(body.pagination, fallback),
  }
}
