import type { AuthUser } from "@/features/auth/types"
import type { BuildingEditRequestSnapshot } from "@/features/building-edit-request/api"
import type { UploadedMedia } from "@/features/uploads"

export type AdminBuildingEditRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"

export type AdminBuildingEditRequestUser = Pick<
  AuthUser,
  "_id" | "name" | "email" | "role" | "status"
>

export type AdminBuildingEditRequestAgentProfile = {
  _id: string
  userId: string
  isOnline: boolean
  isDeleted?: boolean
  displayName: string | null
  profilePhoto: UploadedMedia | null
  phone: string | null
  lineUrl: string | null
  whatsappPhone: string | null
  telegramUrl: string | null
  viberPhone: string | null
  supportLanguages: string[]
  isVerified: boolean
}

export type AdminBuildingEditRequestBuilding =
  BuildingEditRequestSnapshot & {
    _id: string
    isActive: boolean
    minRent: number | null
    maxRent: number | null
  }

export type AdminBuildingEditRequest = {
  _id: string
  status: AdminBuildingEditRequestStatus
  buildingId: string
  building: AdminBuildingEditRequestBuilding | null
  requestedBy: AdminBuildingEditRequestUser
  agentProfile: AdminBuildingEditRequestAgentProfile | null
  requestReason: string | null
  originalBuilding: BuildingEditRequestSnapshot
  proposedBuilding: BuildingEditRequestSnapshot
  reviewedBy: AdminBuildingEditRequestUser | null
  reviewedAt: string | null
  reviewReason: string | null
  createdAt: string
  updatedAt: string
}

export type AdminBuildingEditRequestsPagination = {
  page: number
  limit: number
  total: number
}
