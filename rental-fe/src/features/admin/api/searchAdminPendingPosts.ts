import { ApiError, apiClient } from "@/lib/api-client";

import type { AuthUser } from "@/features/auth/types";
import {
  isRecord,
  parseBuildingSnapshot,
  parseExistingBuilding,
  parseListing,
  parsePendingPostStatus,
  parseUploadedMedia,
  readBoolean,
  readNullableString,
  readNumber,
  readString,
  readStringArray,
  type PendingPostBuildingSnapshot,
  type PendingPostExistingBuilding,
  type PendingPostStatus,
} from "@/features/pending-post";
import type { UploadedMedia } from "@/features/uploads";
import type { Pagination } from "@/features/map-search/types";

type AdminPendingPostSubmitter = Pick<
  AuthUser,
  "_id" | "name" | "email" | "role" | "status"
>;

export type AdminPendingPostAgentProfile = {
  _id: string;
  userId: string;
  isOnline: boolean;
  displayName: string | null;
  profilePhoto: UploadedMedia | null;
  description: string | null;
  phone: string | null;
  lineUrl: string | null;
  whatsappPhone: string | null;
  telegramUrl: string | null;
  viberPhone: string | null;
  supportLanguages: string[];
  isVerified: boolean;
};

export type AdminPendingPostBuildingSnapshot = PendingPostBuildingSnapshot;

export type AdminPendingPostExistingBuilding = PendingPostExistingBuilding;

export type AdminPendingPost = {
  _id: string;
  status: PendingPostStatus;
  submittedBy: AdminPendingPostSubmitter | null;
  agentProfile?: AdminPendingPostAgentProfile;
  existingBuildingId: string | null;
  existingBuilding?: AdminPendingPostExistingBuilding;
  building: AdminPendingPostBuildingSnapshot | null;
  listing: ReturnType<typeof parseListing>;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  approvedBuildingId: string | null;
  approvedListingId: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminPendingPostStatusFilter = PendingPostStatus;

export type SearchAdminPendingPostsInput = {
  status?: AdminPendingPostStatusFilter;
  page?: number;
  limit?: number;
};

export type SearchAdminPendingPostsResponse = {
  success: true;
  data: AdminPendingPost[];
  pagination: Pagination;
};

const readRecord = (value: unknown): Record<string, unknown> => {
  return isRecord(value) ? value : {};
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

const parseSubmittedBy = (
  value: unknown,
): AdminPendingPostSubmitter | null => {
  const submittedBy = readRecord(value);
  const id = readString(submittedBy._id);

  if (!id) return null;

  return {
    _id: id,
    name: readString(submittedBy.name),
    email: readString(submittedBy.email),
    role: readString(submittedBy.role, "USER") as AdminPendingPostSubmitter["role"],
    status: readString(
      submittedBy.status,
      "ACTIVE",
    ) as AdminPendingPostSubmitter["status"],
  };
};

const parseAgentProfile = (
  value: unknown,
): AdminPendingPostAgentProfile | undefined => {
  if (!isRecord(value)) return undefined;

  const id = readString(value._id);
  const userId = readString(value.userId);

  if (!id || !userId) return undefined;

  return {
    _id: id,
    userId,
    isOnline: readBoolean(value.isOnline),
    displayName: readNullableString(value.displayName),
    profilePhoto: parseUploadedMedia(value.profilePhoto),
    description: readNullableString(value.description),
    phone: readNullableString(value.phone),
    lineUrl: readNullableString(value.lineUrl),
    whatsappPhone: readNullableString(value.whatsappPhone),
    telegramUrl: readNullableString(value.telegramUrl),
    viberPhone: readNullableString(value.viberPhone),
    supportLanguages: readStringArray(value.supportLanguages),
    isVerified: readBoolean(value.isVerified),
  };
};

export const parseAdminPendingPost = (value: unknown): AdminPendingPost => {
  const pendingPost = readRecord(value);
  const id = readString(pendingPost._id);

  if (!id) {
    throw new ApiError(
      "Admin pending post response is missing required data.",
      500,
      "INVALID_ADMIN_PENDING_POST_RESPONSE",
    );
  }

  return {
    _id: id,
    status: parsePendingPostStatus(pendingPost.status),
    submittedBy: parseSubmittedBy(pendingPost.submittedBy),
    agentProfile: parseAgentProfile(pendingPost.agentProfile),
    existingBuildingId: readNullableString(pendingPost.existingBuildingId),
    existingBuilding: parseExistingBuilding(pendingPost.existingBuilding),
    building: parseBuildingSnapshot(pendingPost.building),
    listing: parseListing(pendingPost.listing),
    reviewNote: readNullableString(pendingPost.reviewNote),
    reviewedBy: readNullableString(pendingPost.reviewedBy),
    reviewedAt: readNullableString(pendingPost.reviewedAt),
    approvedBuildingId: readNullableString(pendingPost.approvedBuildingId),
    approvedListingId: readNullableString(pendingPost.approvedListingId),
    isDeleted: readBoolean(pendingPost.isDeleted),
    createdAt: readString(pendingPost.createdAt),
    updatedAt: readString(pendingPost.updatedAt),
  };
};

const parseSearchAdminPendingPostsResponse = (
  value: unknown,
  fallback: { page: number; limit: number },
): SearchAdminPendingPostsResponse => {
  const body = readRecord(value);
  const data = Array.isArray(body.data)
    ? body.data.map(parseAdminPendingPost)
    : [];

  return {
    success: true,
    data,
    pagination: parsePagination(body.pagination, fallback),
  };
};

export async function searchAdminPendingPosts({
  status,
  page = 1,
  limit = 20,
}: SearchAdminPendingPostsInput = {}) {
  const normalizedPage = normalizePositiveInteger(page, 1);
  const normalizedLimit = normalizePositiveInteger(limit, 20);
  const searchParams = new URLSearchParams({
    page: String(normalizedPage),
    limit: String(normalizedLimit),
  });

  if (status) {
    searchParams.set("status", status);
  }

  const response = await apiClient.get<SearchAdminPendingPostsResponse>(
    `/admin/pending-posts?${searchParams.toString()}`,
  );

  return parseSearchAdminPendingPostsResponse(response.data, {
    page: normalizedPage,
    limit: normalizedLimit,
  });
}
