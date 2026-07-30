import {
  infiniteQueryOptions,
  queryOptions,
} from "@tanstack/react-query"

import { ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"
import {
  getNextPageParam,
  readPageParam,
} from "@/lib/query-pagination"

import { getAdminBuildingEditRequestById } from "./getAdminBuildingEditRequestById"
import { getAdminReportById } from "./getAdminReportById"
import { getAdminReviewReportById } from "./getAdminReviewReportById"
import { getAdminSuspensionById } from "./getAdminSuspensionById"
import { getAdminUserById } from "./getAdminUserById"
import {
  searchAdminBuildingEditRequests,
  type AdminBuildingEditRequestStatusFilter,
} from "./searchAdminBuildingEditRequests"
import {
  searchAdminPendingPosts,
  type AdminPendingPostStatusFilter,
} from "./searchAdminPendingPosts"
import { searchAdminPlatformAdmins } from "./searchAdminPlatformAdmins"
import {
  searchAdminReports,
  type AdminReportStatusFilter,
} from "./searchAdminReports"
import {
  searchAdminReviewReports,
  type AdminReviewReportStatusFilter,
} from "./searchAdminReviewReports"
import {
  searchAdminSuspensions,
  type AdminSuspensionStatusFilter,
} from "./searchAdminSuspensions"

const ADMIN_PAGE_SIZE = 20

function hasEnabledId(enabled: boolean, id?: string | null): boolean {
  return enabled && typeof id === "string" && id.trim() !== ""
}

export const adminQueries = {
  pendingPosts: (
    status: AdminPendingPostStatusFilter | undefined,
    enabled = true,
  ) =>
    infiniteQueryOptions({
      queryKey: queryKeys.admin.pendingPosts.list(status),
      initialPageParam: 1,
      queryFn: ({ pageParam, signal }) =>
        searchAdminPendingPosts({
          status,
          page: readPageParam(pageParam),
          limit: ADMIN_PAGE_SIZE,
          signal,
        }),
      getNextPageParam,
      enabled,
    }),

  buildingEditRequests: (
    status: AdminBuildingEditRequestStatusFilter | undefined,
    enabled = true,
  ) =>
    infiniteQueryOptions({
      queryKey: queryKeys.admin.buildingEditRequests.list(status),
      initialPageParam: 1,
      queryFn: ({ pageParam, signal }) =>
        searchAdminBuildingEditRequests({
          status,
          page: readPageParam(pageParam),
          limit: ADMIN_PAGE_SIZE,
          signal,
        }),
      getNextPageParam,
      enabled,
    }),

  buildingEditRequestDetail: (
    requestId: string | undefined,
    enabled = true,
  ) =>
    queryOptions({
      queryKey: queryKeys.admin.buildingEditRequests.detail(requestId),
      queryFn: ({ signal }) =>
        getAdminBuildingEditRequestById(requestId ?? "", signal),
      enabled: hasEnabledId(enabled, requestId),
    }),

  reports: (
    status: AdminReportStatusFilter | undefined,
    enabled = true,
  ) =>
    infiniteQueryOptions({
      queryKey: queryKeys.admin.reports.list(status),
      initialPageParam: 1,
      queryFn: ({ pageParam, signal }) =>
        searchAdminReports({
          status,
          page: readPageParam(pageParam),
          limit: ADMIN_PAGE_SIZE,
          signal,
        }),
      getNextPageParam,
      enabled,
    }),

  reportDetail: (reportId: string | undefined, enabled = true) =>
    queryOptions({
      queryKey: queryKeys.admin.reports.detail(reportId),
      queryFn: ({ signal }) => getAdminReportById(reportId ?? "", signal),
      enabled: hasEnabledId(enabled, reportId),
    }),

  reviewReports: (
    status: AdminReviewReportStatusFilter | undefined,
    enabled = true,
  ) =>
    infiniteQueryOptions({
      queryKey: queryKeys.admin.reviewReports.list(status),
      initialPageParam: 1,
      queryFn: ({ pageParam, signal }) =>
        searchAdminReviewReports({
          status,
          page: readPageParam(pageParam),
          limit: ADMIN_PAGE_SIZE,
          signal,
        }),
      getNextPageParam,
      enabled,
    }),

  reviewReportDetail: (
    reviewReportId: string | undefined,
    enabled = true,
  ) =>
    queryOptions({
      queryKey: queryKeys.admin.reviewReports.detail(reviewReportId),
      queryFn: ({ signal }) =>
        getAdminReviewReportById(reviewReportId ?? "", signal),
      enabled: hasEnabledId(enabled, reviewReportId),
      retry: (failureCount, error) =>
        error instanceof ApiError && error.status < 500
          ? false
          : failureCount < 2,
    }),

  suspensions: (
    status: AdminSuspensionStatusFilter | undefined,
    enabled = true,
  ) =>
    infiniteQueryOptions({
      queryKey: queryKeys.admin.suspensions.list(status),
      initialPageParam: 1,
      queryFn: ({ pageParam, signal }) =>
        searchAdminSuspensions({
          status,
          page: readPageParam(pageParam),
          limit: ADMIN_PAGE_SIZE,
          signal,
        }),
      getNextPageParam,
      enabled,
    }),

  suspensionDetail: (
    suspensionId: string | undefined,
    enabled = true,
  ) =>
    queryOptions({
      queryKey: queryKeys.admin.suspensions.detail(suspensionId),
      queryFn: ({ signal }) =>
        getAdminSuspensionById(suspensionId ?? "", signal),
      enabled: hasEnabledId(enabled, suspensionId),
    }),

  platformAdmins: (enabled = true) =>
    infiniteQueryOptions({
      queryKey: queryKeys.admin.platformAdmins.list,
      initialPageParam: 1,
      queryFn: ({ pageParam, signal }) =>
        searchAdminPlatformAdmins({
          page: readPageParam(pageParam),
          limit: ADMIN_PAGE_SIZE,
          signal,
        }),
      getNextPageParam,
      enabled,
    }),

  userDetail: (userId: string | undefined, enabled = true) =>
    queryOptions({
      queryKey: queryKeys.admin.users.detail(userId),
      queryFn: ({ signal }) => getAdminUserById(userId ?? "", signal),
      enabled: hasEnabledId(enabled, userId),
    }),
} as const
