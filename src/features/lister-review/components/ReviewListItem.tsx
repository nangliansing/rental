import {
  Eye,
  EyeOff,
  Flag,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"

import {
  useCreateReviewReport,
  type ReviewReportReason,
} from "@/features/review-report"
import { cn } from "@/lib/utils"
import { Avatar } from "@/shared/components/data-display/Avatar"
import { ConfirmationDialog } from "@/shared/components/dialogs/ConfirmationDialog"

import {
  useDeleteListerReview,
  useToggleListerReviewCollapse,
  type ListerReview,
  type ListerReviewSummary,
} from "../api"
import { formatReviewTag } from "../utils/reviewFormatters"
import { ReportReviewDialog } from "./ReportReviewDialog"

type ReviewListItemProps = {
  review: ListerReview
  reviewSummary?: ListerReviewSummary | null
  currentUserId?: string
  canReportReview: boolean
  listerUserId: string
  isExpanded: boolean
  onToggleExpanded: (reviewId: string) => void
  onEdit: (review: ListerReview) => void
  onReviewSummaryChange: (summary: ListerReviewSummary) => void
}

export function ReviewListItem({
  review,
  reviewSummary,
  currentUserId,
  canReportReview,
  listerUserId,
  isExpanded,
  onToggleExpanded,
  onEdit,
  onReviewSummaryChange,
}: ReviewListItemProps) {
  const isOwnReview = review.reviewerId === currentUserId
  const isProfileOwner = currentUserId === listerUserId
  const canReportThisReview = canReportReview && !isOwnReview
  const isCollapsed = review.visibility?.isCollapsed && !isExpanded
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [moderationError, setModerationError] = useState("")
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  const [selectedReportReason, setSelectedReportReason] =
    useState<ReviewReportReason | null>(null)
  const [reportNote, setReportNote] = useState("")
  const [reportError, setReportError] = useState("")
  const [reportSuccessMessage, setReportSuccessMessage] = useState("")
  const deleteMutation = useDeleteListerReview()
  const collapseMutation = useToggleListerReviewCollapse()
  const reportMutation = useCreateReviewReport()

  const closeReportDialog = () => {
    if (reportMutation.isPending) return

    setIsReportDialogOpen(false)
    setSelectedReportReason(null)
    setReportNote("")
    setReportError("")
    setReportSuccessMessage("")
  }

  return (
    <article className="border-b border-slate-200 pb-4 last:border-b-0">
      <div className="flex gap-3">
        <ReviewerAvatar review={review} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">
                {review.reviewer?.displayName ??
                  review.reviewer?.name ??
                  "Reviewer"}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <RatingStars rating={review.rating} />
                <span className="text-xs font-medium text-slate-400">
                  {formatReviewDate(review.createdAt)}
                </span>
                {review.editedAt && (
                  <span className="text-xs font-medium text-slate-400">
                    Edited
                  </span>
                )}
              </div>
            </div>

            <ReviewActionsMenu
              review={review}
              isOwnReview={isOwnReview}
              isProfileOwner={isProfileOwner}
              canReportReview={canReportThisReview}
              isBusy={
                deleteMutation.isPending ||
                collapseMutation.isPending ||
                reportMutation.isPending
              }
              onEdit={() => onEdit(review)}
              onDelete={() => {
                deleteMutation.reset()
                setDeleteError("")
                setIsDeleteDialogOpen(true)
              }}
              onToggleCollapse={() => {
                setModerationError("")
                collapseMutation.mutate(
                  { review },
                  {
                    onSuccess: () => setModerationError(""),
                    onError: (error) => {
                      setModerationError(
                        error instanceof Error
                          ? error.message
                          : "Could not update review visibility. Please try again.",
                      )
                    },
                  },
                )
              }}
              onReport={() => {
                setSelectedReportReason(null)
                setReportNote("")
                setReportError("")
                setReportSuccessMessage("")
                setIsReportDialogOpen(true)
              }}
            />
          </div>

          {isCollapsed ? (
            <div className="mt-3 rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-500">
              <p className="font-medium text-slate-700">
                This review is collapsed because it may contain harsh language.
              </p>
              <button
                type="button"
                className="mt-2 text-sm font-semibold text-slate-950 underline-offset-4 hover:underline"
                onClick={() => onToggleExpanded(review._id)}
              >
                View anyway
              </button>
            </div>
          ) : (
            <>
              {review.comment && (
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                  {review.comment}
                </p>
              )}
              {review.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {review.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      {formatReviewTag(tag)}
                    </span>
                  ))}
                </div>
              )}
              {review.visibility?.isCollapsed && (
                <button
                  type="button"
                  className="mt-3 text-xs font-semibold text-slate-500 underline-offset-4 hover:text-slate-950 hover:underline"
                  onClick={() => onToggleExpanded(review._id)}
                >
                  Collapse again
                </button>
              )}
            </>
          )}

          {moderationError && (
            <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">
              {moderationError}
            </p>
          )}
        </div>
      </div>

      <DeleteReviewConfirmDialog
        isOpen={isDeleteDialogOpen}
        isSubmitting={deleteMutation.isPending}
        error={deleteError}
        onClose={() => {
          if (deleteMutation.isPending) return

          deleteMutation.reset()
          setDeleteError("")
          setIsDeleteDialogOpen(false)
        }}
        onConfirm={() =>
          deleteMutation.mutate(
            { review, currentSummary: reviewSummary },
            {
              onSuccess: (result) => {
                setIsDeleteDialogOpen(false)
                setDeleteError("")
                onReviewSummaryChange(result.reviewSummary)
              },
              onError: (error) => {
                setDeleteError(
                  error instanceof Error
                    ? error.message
                    : "Could not delete review. Please try again.",
                )
              },
            },
          )
        }
      />

      <ReportReviewDialog
        isOpen={isReportDialogOpen}
        isSubmitting={reportMutation.isPending}
        error={reportError}
        successMessage={reportSuccessMessage}
        selectedReason={selectedReportReason}
        note={reportNote}
        onReasonChange={(reason) => {
          setSelectedReportReason(reason)
          setReportError("")
        }}
        onNoteChange={(note) => {
          setReportNote(note)
          setReportError("")
        }}
        onCancel={closeReportDialog}
        onSubmit={() => {
          if (!selectedReportReason) {
            setReportError("Please choose a reason.")
            return
          }

          reportMutation.mutate(
            {
              reviewId: review._id,
              reason: selectedReportReason,
              note: reportNote,
            },
            {
              onSuccess: () => {
                setReportError("")
                setReportSuccessMessage(
                  "Report sent. Our team will review it.",
                )
                window.setTimeout(() => {
                  setIsReportDialogOpen(false)
                  setSelectedReportReason(null)
                  setReportNote("")
                  setReportSuccessMessage("")
                }, 1200)
              },
              onError: (error) => {
                setReportSuccessMessage("")
                setReportError(
                  error instanceof Error
                    ? error.message
                    : "Could not submit report. Please try again.",
                )
              },
            },
          )
        }}
      />
    </article>
  )
}

function DeleteReviewConfirmDialog({
  isOpen,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}: {
  isOpen: boolean
  isSubmitting: boolean
  error: string
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      title="Delete review?"
      description={
        <p>
          This removes your review from this profile. You can write a new one
          later if you want.
        </p>
      }
      confirmLabel="Delete review"
      cancelLabel="Keep review"
      tone="danger"
      icon={<Trash2 className="h-5 w-5 text-rose-600" />}
      error={error}
      isSubmitting={isSubmitting}
      closeAriaLabel="Close delete review confirmation"
      onClose={onClose}
      onConfirm={onConfirm}
    />
  )
}

function ReviewActionsMenu({
  review,
  isOwnReview,
  isProfileOwner,
  canReportReview,
  isBusy,
  onEdit,
  onDelete,
  onToggleCollapse,
  onReport,
}: {
  review: ListerReview
  isOwnReview: boolean
  isProfileOwner: boolean
  canReportReview: boolean
  isBusy: boolean
  onEdit: () => void
  onDelete: () => void
  onToggleCollapse: () => void
  onReport: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const hasActions =
    isOwnReview || (isProfileOwner && !isOwnReview) || canReportReview

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  if (!hasActions) return null

  const handleEdit = () => {
    setIsOpen(false)
    onEdit()
  }

  const handleDelete = () => {
    setIsOpen(false)
    onDelete()
  }

  const handleToggleCollapse = () => {
    setIsOpen(false)
    onToggleCollapse()
  }

  const handleReport = () => {
    setIsOpen(false)
    onReport()
  }

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950",
          isOpen && "bg-slate-100 text-slate-950",
        )}
        aria-label="Review options"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        disabled={isBusy}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-9 z-20 w-48 rounded-xl border border-slate-200 bg-white p-1.5 text-sm font-semibold text-slate-700 shadow-lg">
          {isOwnReview && (
            <>
              <ReviewActionButton onClick={handleEdit}>
                <Pencil className="h-4 w-4" />
                Edit review
              </ReviewActionButton>
              <ReviewActionButton tone="danger" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
                Delete review
              </ReviewActionButton>
            </>
          )}

          {isProfileOwner && !isOwnReview && (
            <ReviewActionButton onClick={handleToggleCollapse}>
              {review.visibility?.isCollapsed ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              {review.visibility?.isCollapsed
                ? "Show review"
                : "Collapse review"}
            </ReviewActionButton>
          )}

          {canReportReview && (
            <ReviewActionButton onClick={handleReport}>
              <Flag className="h-4 w-4" />
              Report review
            </ReviewActionButton>
          )}
        </div>
      )}
    </div>
  )
}

function ReviewActionButton({
  children,
  tone = "neutral",
  onClick,
}: {
  children: React.ReactNode
  tone?: "neutral" | "danger"
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition",
        tone === "danger"
          ? "text-rose-600 hover:bg-rose-50"
          : "hover:bg-slate-50",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function ReviewerAvatar({ review }: { review: ListerReview }) {
  const displayName =
    review.reviewer?.displayName ?? review.reviewer?.name ?? "Reviewer"

  return (
    <Avatar
      displayName={displayName}
      photo={review.reviewer?.profilePhoto}
      colorKey={review.reviewer?.userId ?? review.reviewerId}
      size="md"
    />
  )
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5 text-amber-400">
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={cn("h-3.5 w-3.5", value <= rating ? "fill-current" : "")}
        />
      ))}
    </div>
  )
}

function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}
