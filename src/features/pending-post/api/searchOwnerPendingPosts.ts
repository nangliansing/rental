import { apiClient } from "@/lib/api-client";
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination";

import type { Pagination } from "@/features/map-search/types";

import {
  parsePendingPost,
  type PendingPost,
  type PendingPostStatus,
} from "./createPendingPost";

export type OwnerPendingPostStatusFilter = "all" | PendingPostStatus;

export type SearchOwnerPendingPostsInput = {
  status?: OwnerPendingPostStatusFilter;
  page?: number;
  limit?: number;
  signal?: AbortSignal;
};

export type SearchOwnerPendingPostsResponse = {
  success: true;
  data: PendingPost[];
  pagination: Pagination;
};

const readRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
};

const readNumber = (value: unknown, fallback: number) => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const normalizePositiveInteger = (value: unknown, fallback: number) => {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : fallback;

  return Number.isInteger(numberValue) && numberValue > 0
    ? numberValue
    : fallback;
};

const parsePagination = (
  value: unknown,
  fallback: { page: number; limit: number },
): Pagination => {
  const pagination = readRecord(value);

  return {
    page: readNumber(pagination.page, fallback.page),
    limit: readNumber(pagination.limit, fallback.limit),
    total: readNumber(pagination.total, 0),
  };
};

const parseSearchOwnerPendingPostsResponse = (
  value: unknown,
  fallback: { page: number; limit: number },
): SearchOwnerPendingPostsResponse => {
  const body = readRecord(value);
  const data = Array.isArray(body.data) ? body.data.map(parsePendingPost) : [];

  return {
    success: true,
    data,
    pagination: parsePagination(body.pagination, fallback),
  };
};

export async function searchOwnerPendingPosts({
  status = "all",
  page = 1,
  limit = DEFAULT_LISTING_PAGE_SIZE,
  signal,
}: SearchOwnerPendingPostsInput = {}) {
  const normalizedPage = normalizePositiveInteger(page, 1);
  const normalizedLimit = normalizePositiveInteger(limit, 20);
  const searchParams = new URLSearchParams({
    page: String(normalizedPage),
    limit: String(normalizedLimit),
  });

  if (status !== "all") {
    searchParams.set("status", status);
  }

  const response = await apiClient.get<SearchOwnerPendingPostsResponse>(
    `/pending-posts?${searchParams.toString()}`,
    true,
    signal,
  );

  return parseSearchOwnerPendingPostsResponse(response.data, {
    page: normalizedPage,
    limit: normalizedLimit,
  });
}
