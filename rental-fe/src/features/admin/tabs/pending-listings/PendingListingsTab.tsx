import { useState } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"

import {
  searchAdminPendingPosts,
  useApproveAdminPendingPost,
  useRejectAdminPendingPost,
  type AdminPendingPost,
  type AdminPendingPostStatusFilter,
} from "../../api"
import { AdminFilterPills, AdminWorkspace } from "../../components"
import {
  AdminEmptyState,
  AdminListState,
} from "../../components/AdminListState"
import { getNextAdminPageParam } from "../../shared/adminPagination"
import { PendingPostDetail } from "./PendingPostDetail"
import { PendingPostListItem } from "./PendingPostListItem"
import { PendingReviewActionDialog } from "./PendingReviewActionDialog"
import {
  PendingReviewContext,
  type PendingReviewAction,
  type PendingReviewContextValue,
} from "./PendingReviewContext"
import { pendingStatusFilters } from "./pendingListingReasonOptions"

export type PendingListingsTabProps = {
  enabled: boolean
  currentUserId?: string
  onSuspendUser: (target: { userId: string; name: string }) => void
}

export function PendingListingsTab({
  enabled,
  currentUserId,
  onSuspendUser,
}: PendingListingsTabProps) {
  const [status, setStatus] = useState<
    AdminPendingPostStatusFilter | undefined
  >("PENDING")
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [reviewAction, setReviewAction] = useState<PendingReviewAction>(null)
  const [selectedRejectReason, setSelectedRejectReason] = useState("")
  const [reviewNote, setReviewNote] = useState("")
  const [reviewError, setReviewError] = useState<string | null>(null)

  const pendingPostsQuery = useInfiniteQuery({
    queryKey: queryKeys.admin.pendingPosts.list(status),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      searchAdminPendingPosts({
        status,
        page: Number(pageParam),
        limit: 20,
      }),
    getNextPageParam: getNextAdminPageParam,
    enabled,
  })

  const approveMutation = useApproveAdminPendingPost(currentUserId)
  const rejectMutation = useRejectAdminPendingPost()
  const isReviewSubmitting =
    approveMutation.isPending || rejectMutation.isPending

  const pendingPosts =
    pendingPostsQuery.data?.pages.flatMap((page) => page.data) ?? []
  const pagination = pendingPostsQuery.data?.pages[0]?.pagination
  const selectedPost =
    pendingPosts.find((post) => post._id === selectedPostId) ??
    pendingPosts[0] ??
    null

  const closeReviewDialog = () => {
    setReviewAction(null)
    setSelectedRejectReason("")
    setReviewNote("")
    setReviewError(null)
  }

  const handleOpenApproveDialog = (post: AdminPendingPost) => {
    setReviewAction({ type: "approve", post })
    setSelectedRejectReason("")
    setReviewNote("")
    setReviewError(null)
  }

  const handleOpenRejectDialog = (post: AdminPendingPost) => {
    setReviewAction({ type: "reject", post })
    setSelectedRejectReason("")
    setReviewNote("")
    setReviewError(null)
  }

  const handleConfirmReviewAction = () => {
    if (!reviewAction || isReviewSubmitting) return

    if (reviewAction.type === "approve") {
      const trimmedApproveReason = selectedRejectReason.trim()
      const trimmedReviewNote = reviewNote.trim()

      if (!trimmedApproveReason && !trimmedReviewNote) {
        setReviewError("Approval reason is required.")
        return
      }

      const approvalReason = trimmedApproveReason
        ? [trimmedApproveReason, trimmedReviewNote && `Note: ${trimmedReviewNote}`]
            .filter(Boolean)
            .join("\n\n")
        : trimmedReviewNote

      approveMutation.mutate(
        {
          pendingPostId: reviewAction.post._id,
          reason: approvalReason,
        },
        {
          onSuccess: closeReviewDialog,
          onError: (error) => {
            setReviewError(
              error instanceof Error
                ? error.message
                : "Could not approve submission.",
            )
          },
        },
      )
      return
    }

    const trimmedRejectReason = selectedRejectReason.trim()
    const trimmedReviewNote = reviewNote.trim()

    if (!trimmedRejectReason && !trimmedReviewNote) {
      setReviewError("Rejection reason is required.")
      return
    }

    const rejectionReason = trimmedRejectReason
      ? [trimmedRejectReason, trimmedReviewNote && `Note: ${trimmedReviewNote}`]
          .filter(Boolean)
          .join("\n\n")
      : trimmedReviewNote

    rejectMutation.mutate(
      {
        pendingPostId: reviewAction.post._id,
        reason: rejectionReason,
      },
      {
        onSuccess: closeReviewDialog,
        onError: (error) => {
          setReviewError(
            error instanceof Error
              ? error.message
              : "Could not reject submission.",
          )
        },
      },
    )
  }

  const pendingReviewContextValue: PendingReviewContextValue = {
    selectedPost,
    isReviewSubmitting,
    selectPost: setSelectedPostId,
    openApproveDialog: handleOpenApproveDialog,
    openRejectDialog: handleOpenRejectDialog,
    action: reviewAction,
    selectedRejectReason,
    reviewNote,
    error: reviewError,
    setSelectedRejectReason: (value) => {
      setSelectedRejectReason(value)
      if (reviewError) setReviewError(null)
    },
    setReviewNote: (value) => {
      setReviewNote(value)
      if (reviewError) setReviewError(null)
    },
    closeDialog: closeReviewDialog,
    confirmAction: handleConfirmReviewAction,
  }

  return (
    <PendingReviewContext.Provider value={pendingReviewContextValue}>
      <AdminWorkspace
        title="Pending listings"
        description="Select one submission to inspect."
        total={pagination?.total}
        filters={
          <AdminFilterPills
            options={pendingStatusFilters}
            value={status}
            onChange={(nextStatus) => {
              setStatus(nextStatus)
              setSelectedPostId(null)
            }}
          />
        }
        list={
          <AdminListState
            isLoading={pendingPostsQuery.isLoading}
            error={pendingPostsQuery.error}
            errorFallback="Could not load pending listings."
            isEmpty={pendingPosts.length === 0}
            emptyTitle="No pending listings"
            emptyDescription="New submissions will appear here when listers send them for review."
            onRetry={() => void pendingPostsQuery.refetch()}
            hasNextPage={Boolean(pendingPostsQuery.hasNextPage)}
            isFetchingNextPage={pendingPostsQuery.isFetchingNextPage}
            onFetchNextPage={() => void pendingPostsQuery.fetchNextPage()}
          >
            {pendingPosts.map((post) => (
              <PendingPostListItem key={post._id} post={post} />
            ))}
          </AdminListState>
        }
        detail={
          selectedPost ? (
            <PendingPostDetail
              post={selectedPost}
              onSuspendUser={onSuspendUser}
            />
          ) : (
            <AdminEmptyState
              title="Select a submission"
              description="Choose a pending listing from the left to review the details."
            />
          )
        }
      />

      <PendingReviewActionDialog />
    </PendingReviewContext.Provider>
  )
}
