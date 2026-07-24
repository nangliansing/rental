import { apiClient } from "@/lib/api-client"

import type { Pagination } from "@/features/map-search/types"

import type { ListerReview, ListerReviewSort } from "./createListerReview"
import { parseSearchListerReviewsResponse } from "./listerReviewResponseParsers"

export type SearchListerReviewsInput = {
  listerProfileId: string
  page?: number
  limit?: number
  sort?: ListerReviewSort
}

export type SearchListerReviewsResponse = {
  success: true
  data: {
    myReview: ListerReview | null
    reviews: ListerReview[]
  }
  pagination: Pagination
}

export async function searchListerReviews({
  listerProfileId,
  page = 1,
  limit = 20,
  sort = "latest",
}: SearchListerReviewsInput) {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sort,
  })

  const response = await apiClient.get<unknown>(
    `/lister-reviews/listers/${listerProfileId}?${searchParams.toString()}`,
  )

  return parseSearchListerReviewsResponse(response.data, { page, limit })
}
