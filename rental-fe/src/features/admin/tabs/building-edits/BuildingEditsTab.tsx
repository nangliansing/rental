import { useState } from "react"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"

import {
  getAdminBuildingEditRequestById,
  searchAdminBuildingEditRequests,
  useApproveAdminBuildingEditRequest,
  useRejectAdminBuildingEditRequest,
  type AdminBuildingEditRequest,
  type AdminBuildingEditRequestStatusFilter,
} from "../../api"
import { AdminFilterPills, AdminWorkspace } from "../../components"
import { AdminDetailState } from "../../components/AdminDetailState"
import {
  AdminEmptyState,
  AdminListState,
} from "../../components/AdminListState"
import { getNextAdminPageParam } from "../../shared/adminPagination"
import { BuildingEditRequestDetail } from "./BuildingEditRequestDetail"
import { BuildingEditRequestListItem } from "./BuildingEditRequestListItem"
import {
  BuildingEditReviewContext,
  type BuildingEditApproveAction,
  type BuildingEditRejectAction,
  type BuildingEditReviewContextValue,
} from "./BuildingEditReviewContext"
import {
  BuildingEditApproveDialog,
  BuildingEditRejectDialog,
} from "./BuildingEditReviewDialogs"
import { buildingEditStatusFilters } from "./buildingEditReasonOptions"

export type BuildingEditsTabProps = {
  enabled: boolean
}

export function BuildingEditsTab({ enabled }: BuildingEditsTabProps) {
  const [status, setStatus] = useState<
    AdminBuildingEditRequestStatusFilter | undefined
  >("PENDING")
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [approveAction, setApproveAction] =
    useState<BuildingEditApproveAction>(null)
  const [rejectAction, setRejectAction] =
    useState<BuildingEditRejectAction>(null)
  const [selectedRejectReason, setSelectedRejectReason] = useState("")
  const [reviewReason, setReviewReason] = useState("")
  const [reviewError, setReviewError] = useState<string | null>(null)

  const buildingEditRequestsQuery = useInfiniteQuery({
    queryKey: queryKeys.admin.buildingEditRequests.list(status),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      searchAdminBuildingEditRequests({
        status,
        page: Number(pageParam),
        limit: 20,
      }),
    getNextPageParam: getNextAdminPageParam,
    enabled,
  })

  const approveMutation = useApproveAdminBuildingEditRequest()
  const rejectMutation = useRejectAdminBuildingEditRequest()
  const isReviewSubmitting =
    approveMutation.isPending || rejectMutation.isPending

  const buildingEditRequests =
    buildingEditRequestsQuery.data?.pages.flatMap((page) => page.data) ?? []
  const pagination = buildingEditRequestsQuery.data?.pages[0]?.pagination
  const selectedRequestListItem =
    buildingEditRequests.find((request) => request._id === selectedRequestId) ??
    buildingEditRequests[0] ??
    null
  const effectiveRequestId =
    selectedRequestId ?? selectedRequestListItem?._id

  const buildingEditRequestDetailQuery = useQuery({
    queryKey: queryKeys.admin.buildingEditRequests.detail(effectiveRequestId),
    queryFn: () => getAdminBuildingEditRequestById(effectiveRequestId!),
    enabled: enabled && Boolean(effectiveRequestId),
  })

  const selectedRequest =
    buildingEditRequestDetailQuery.data ?? selectedRequestListItem ?? null

  const closeApproveDialog = () => {
    setApproveAction(null)
    setReviewReason("")
    setReviewError(null)
  }

  const closeRejectDialog = () => {
    setRejectAction(null)
    setSelectedRejectReason("")
    setReviewReason("")
    setReviewError(null)
  }

  const handleOpenApproveDialog = (request: AdminBuildingEditRequest) => {
    setApproveAction(request)
    setRejectAction(null)
    setSelectedRejectReason("")
    setReviewReason("")
    setReviewError(null)
  }

  const handleOpenRejectDialog = (request: AdminBuildingEditRequest) => {
    setRejectAction(request)
    setApproveAction(null)
    setSelectedRejectReason("")
    setReviewReason("")
    setReviewError(null)
  }

  const handleApproveBuildingEdit = () => {
    if (!approveAction || isReviewSubmitting) return

    approveMutation.mutate(
      {
        buildingEditRequestId: approveAction._id,
        reviewReason,
      },
      {
        onSuccess: closeApproveDialog,
        onError: (error) => {
          setReviewError(
            error instanceof Error
              ? error.message
              : "Could not approve building edit.",
          )
        },
      },
    )
  }

  const handleRejectBuildingEdit = () => {
    if (!rejectAction || isReviewSubmitting) return

    const trimmedRejectReason = selectedRejectReason.trim()
    const trimmedReviewReason = reviewReason.trim()

    if (!trimmedRejectReason && !trimmedReviewReason) {
      setReviewError("Rejection reason is required.")
      return
    }

    const mergedReviewReason = trimmedRejectReason
      ? [trimmedRejectReason, trimmedReviewReason && `Note: ${trimmedReviewReason}`]
          .filter(Boolean)
          .join("\n\n")
      : trimmedReviewReason

    rejectMutation.mutate(
      {
        buildingEditRequestId: rejectAction._id,
        reviewReason: mergedReviewReason,
      },
      {
        onSuccess: closeRejectDialog,
        onError: (error) => {
          setReviewError(
            error instanceof Error
              ? error.message
              : "Could not reject building edit.",
          )
        },
      },
    )
  }

  const buildingEditReviewContextValue: BuildingEditReviewContextValue = {
    selectedRequest,
    isReviewSubmitting,
    selectRequest: setSelectedRequestId,
    openApproveDialog: handleOpenApproveDialog,
    openRejectDialog: handleOpenRejectDialog,
    approveAction,
    rejectAction,
    selectedRejectReason,
    reviewReason,
    error: reviewError,
    setSelectedRejectReason: (value) => {
      setSelectedRejectReason(value)
      if (reviewError) setReviewError(null)
    },
    setReviewReason: (value) => {
      setReviewReason(value)
      if (reviewError) setReviewError(null)
    },
    closeApproveDialog,
    closeRejectDialog,
    approveEdit: handleApproveBuildingEdit,
    rejectEdit: handleRejectBuildingEdit,
  }

  return (
    <BuildingEditReviewContext.Provider value={buildingEditReviewContextValue}>
      <AdminWorkspace
        title="Building edits"
        description="Review proposed changes to existing buildings."
        total={pagination?.total}
        filters={
          <AdminFilterPills
            options={buildingEditStatusFilters}
            value={status}
            onChange={(nextStatus) => {
              setStatus(nextStatus)
              setSelectedRequestId(null)
            }}
          />
        }
        list={
          <AdminListState
            isLoading={buildingEditRequestsQuery.isLoading}
            error={buildingEditRequestsQuery.error}
            errorFallback="Could not load building edit requests."
            isEmpty={buildingEditRequests.length === 0}
            emptyTitle="No building edit requests"
            emptyDescription="Requests to update building details will appear here."
            onRetry={() => void buildingEditRequestsQuery.refetch()}
            hasNextPage={Boolean(buildingEditRequestsQuery.hasNextPage)}
            isFetchingNextPage={buildingEditRequestsQuery.isFetchingNextPage}
            onFetchNextPage={() =>
              void buildingEditRequestsQuery.fetchNextPage()
            }
          >
            {buildingEditRequests.map((request) => (
              <BuildingEditRequestListItem key={request._id} request={request} />
            ))}
          </AdminListState>
        }
        detail={
          <AdminDetailState
            isLoading={buildingEditRequestDetailQuery.isLoading}
            shouldShowLoading={Boolean(effectiveRequestId)}
            error={buildingEditRequestDetailQuery.error}
            errorFallback="Could not load this building edit request."
            onRetry={() => void buildingEditRequestDetailQuery.refetch()}
          >
            {selectedRequest ? (
              <BuildingEditRequestDetail request={selectedRequest} />
            ) : (
              <AdminEmptyState
                title="Select a building edit"
                description="Choose a request from the left to compare the current and proposed details."
              />
            )}
          </AdminDetailState>
        }
      />

      <BuildingEditApproveDialog />
      <BuildingEditRejectDialog />
    </BuildingEditReviewContext.Provider>
  )
}
