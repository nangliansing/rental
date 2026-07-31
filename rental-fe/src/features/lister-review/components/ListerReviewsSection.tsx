import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import { Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { useMyAgentProfile } from "@/features/profile/api/useMyAgentProfile"
import { cn } from "@/lib/utils"
import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"
import {
  DialogDescription,
  DialogShell,
  DialogTitle,
} from "@/shared/components/dialogs/DialogShell"
import { InfiniteScrollSentinel } from "@/shared/components/feedback/InfiniteScrollSentinel"
import { SegmentedTabs } from "@/shared/components/inputs/SegmentedTabs"

import {
  useCreateListerReview,
  useUpdateListerReview,
  useSearchListerReviews,
  type ListerReview,
  type ListerReviewSummary,
  type ListerReviewSort,
} from "../api"
import { ReviewForm, type ReviewFormValues } from "./ReviewForm"
import { ReviewList } from "./ReviewList"
import { ReviewSummary } from "./ReviewSummary"

const SORT_OPTIONS: {
  id: ListerReviewSort
  label: string
}[] = [
  { id: "latest", label: "Latest" },
  { id: "oldest", label: "Oldest" },
  { id: "highest", label: "Highest" },
  { id: "lowest", label: "Lowest" },
]

type ReviewDialogState =
  | { mode: "create"; review?: undefined }
  | { mode: "edit"; review: ListerReview }
  | null

type ReviewsContextValue = {
  sort: ListerReviewSort
  setSort: (sort: ListerReviewSort) => void
  expandedIds: Set<string>
  toggleExpanded: (reviewId: string) => void
  dialog: ReviewDialogState
  openCreateDialog: () => void
  openEditDialog: (review: ListerReview) => void
  closeDialog: () => void
}

const ReviewsContext = createContext<ReviewsContextValue | null>(null)

function useReviewsContext() {
  const context = useContext(ReviewsContext)

  if (!context) {
    throw new Error("useReviewsContext must be used inside ReviewsProvider")
  }

  return context
}

type ListerReviewsSectionProps = {
  listerProfileId: string
  listerUserId?: string | null
  reviewSummary?: ListerReviewSummary | null
  showHeader?: boolean
  className?: string
}

export function ListerReviewsSection({
  listerProfileId,
  listerUserId,
  reviewSummary,
  showHeader = true,
  className,
}: ListerReviewsSectionProps) {
  const [sort, setSort] = useState<ListerReviewSort>("latest")
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  const [dialog, setDialog] = useState<ReviewDialogState>(null)
  const [summaryOverride, setSummaryOverride] = useState<{
    listerProfileId: string
    summary: ListerReviewSummary
  } | null>(null)
  const currentSummary =
    summaryOverride?.listerProfileId === listerProfileId
      ? summaryOverride.summary
      : reviewSummary
  const handleReviewSummaryChange = useCallback(
    (summary: ListerReviewSummary) => {
      setSummaryOverride({ listerProfileId, summary })
    },
    [listerProfileId],
  )

  const contextValue = useMemo<ReviewsContextValue>(
    () => ({
      sort,
      setSort,
      expandedIds,
      toggleExpanded: (reviewId) => {
        setExpandedIds((current) => {
          const next = new Set(current)

          if (next.has(reviewId)) {
            next.delete(reviewId)
          } else {
            next.add(reviewId)
          }

          return next
        })
      },
      dialog,
      openCreateDialog: () => setDialog({ mode: "create" }),
      openEditDialog: (review) => setDialog({ mode: "edit", review }),
      closeDialog: () => setDialog(null),
    }),
    [dialog, expandedIds, sort],
  )

  return (
    <ReviewsContext.Provider value={contextValue}>
      <section className={cn("space-y-5 py-6", className)}>
        <ReviewsContent
          listerProfileId={listerProfileId}
          listerUserId={listerUserId}
          reviewSummary={currentSummary}
          onReviewSummaryChange={handleReviewSummaryChange}
          showHeader={showHeader}
        />
      </section>
    </ReviewsContext.Provider>
  )
}

function ReviewsContent({
  listerProfileId,
  listerUserId,
  reviewSummary,
  onReviewSummaryChange,
  showHeader,
}: {
  listerProfileId: string
  listerUserId?: string | null
  reviewSummary?: ListerReviewSummary | null
  onReviewSummaryChange: (summary: ListerReviewSummary) => void
  showHeader: boolean
}) {
  const { user, isAuthenticated } = useAuth()
  const myAgentProfileQuery = useMyAgentProfile({
    enabled: isAuthenticated,
  })
  const {
    sort,
    expandedIds,
    toggleExpanded,
    openCreateDialog,
    openEditDialog,
    dialog,
    closeDialog,
  } = useReviewsContext()
  const reviewsQuery = useSearchListerReviews({
    listerProfileId,
    sort,
    limit: 10,
  })
  const myReview = reviewsQuery.data?.pages[0]?.data.myReview ?? null
  const reviews = useMemo(
    () => reviewsQuery.data?.pages.flatMap((page) => page.data.reviews) ?? [],
    [reviewsQuery.data],
  )
  const isOwnProfile =
    (Boolean(listerUserId) && user?._id === listerUserId) ||
    myAgentProfileQuery.data?._id === listerProfileId
  const canReportReviews = isAuthenticated && user?.status === "ACTIVE"
  const canCreateReview =
    isAuthenticated &&
    user?.status === "ACTIVE" &&
    !isOwnProfile &&
    !myReview &&
    reviewsQuery.isSuccess

  return (
    <>
      <ReviewsSectionToolbar
        showHeader={showHeader}
        canCreateReview={canCreateReview}
        onCreateReview={openCreateDialog}
      />

      <ReviewSummary summary={reviewSummary} />

      <ReviewList
        myReview={myReview}
        reviews={reviews}
        reviewSummary={reviewSummary}
        currentUserId={user?._id}
        canReportReviews={canReportReviews}
        listerUserId={listerUserId ?? ""}
        expandedIds={expandedIds}
        onToggleExpanded={toggleExpanded}
        onEdit={openEditDialog}
        onReviewSummaryChange={onReviewSummaryChange}
      />

      {reviewsQuery.isLoading && (
        <ReviewsMessage isLoading message="Loading reviews..." />
      )}

      {reviewsQuery.isError && (
        <ReviewsMessage message="Could not load reviews." />
      )}

      {!reviewsQuery.isLoading &&
        !reviewsQuery.isError &&
        !myReview &&
        reviews.length === 0 && (
          <ReviewsMessage message="No reviews yet." />
        )}

      {!reviewsQuery.isLoading && !reviewsQuery.isError && (
        <InfiniteScrollSentinel
          hasNextPage={Boolean(reviewsQuery.hasNextPage)}
          isFetchingNextPage={reviewsQuery.isFetchingNextPage}
          onFetchNextPage={() => {
            void reviewsQuery.fetchNextPage()
          }}
          endMessage={reviews.length || myReview ? "No more reviews" : ""}
        />
      )}

      <ReviewFormModal
        listerProfileId={listerProfileId}
        reviewSummary={reviewSummary}
        dialog={dialog}
        onReviewSummaryChange={onReviewSummaryChange}
        onClose={closeDialog}
      />
    </>
  )
}

function ReviewsSectionToolbar({
  showHeader,
  canCreateReview,
  onCreateReview,
}: {
  showHeader: boolean
  canCreateReview: boolean
  onCreateReview: () => void
}) {
  return (
    <div className="space-y-4">
      {showHeader ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-slate-950">Reviews</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Honest feedback from people who contacted this profile.
              </p>
            </div>

            {canCreateReview && (
              <WriteReviewButton
                className="w-full sm:w-auto sm:shrink-0"
                onClick={onCreateReview}
              />
            )}
          </div>

          <ReviewSortToolbar />
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ReviewSortToolbar className="min-w-0 flex-1" />
          {canCreateReview && (
            <WriteReviewButton
              className="w-full sm:w-auto sm:shrink-0"
              onClick={onCreateReview}
            />
          )}
        </div>
      )}
    </div>
  )
}

function WriteReviewButton({
  className,
  onClick,
}: {
  className?: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      className={cn("h-10 rounded-full px-5", className)}
      onClick={onClick}
    >
      <Plus className="h-4 w-4" />
      Write review
    </Button>
  )
}

function ReviewSortToolbar({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col items-start", className)}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Sort by
      </p>
      <ReviewSortControl />
    </div>
  )
}

function ReviewSortControl() {
  const { sort, setSort } = useReviewsContext()

  return (
    <SegmentedTabs
      options={SORT_OPTIONS}
      value={sort}
      aria-label="Review sort"
      className="w-fit max-w-full"
      tabClassName="px-3 sm:px-4"
      onChange={setSort}
    />
  )
}

function ReviewFormModal({
  listerProfileId,
  reviewSummary,
  dialog,
  onReviewSummaryChange,
  onClose,
}: {
  listerProfileId: string
  reviewSummary?: ListerReviewSummary | null
  dialog: ReviewDialogState
  onReviewSummaryChange: (summary: ListerReviewSummary) => void
  onClose: () => void
}) {
  const { user } = useAuth()
  const initialReview = dialog?.mode === "edit" ? dialog.review : null
  const mode = dialog?.mode ?? "create"
  const createMutation = useCreateListerReview()
  const updateMutation = useUpdateListerReview()
  const mutation = initialReview ? updateMutation : createMutation
  const handleClose = useCallback(() => {
    createMutation.reset()
    updateMutation.reset()
    onClose()
  }, [createMutation, onClose, updateMutation])

  const handleSubmit = (values: ReviewFormValues) => {
    if (initialReview) {
      updateMutation.mutate(
        {
          reviewId: initialReview._id,
          review: initialReview,
          currentSummary: reviewSummary,
          rating: values.rating,
          tags: values.tags,
          comment: values.comment,
        },
        {
          onSuccess: (result) => {
            onReviewSummaryChange(result.reviewSummary)
            handleClose()
          },
        },
      )
      return
    }
    if (!user?._id) return
    createMutation.mutate(
      {
        listerProfileId,
        reviewerId: user._id,
        currentSummary: reviewSummary,
        rating: values.rating,
        tags: values.tags,
        comment: values.comment,
      },
      {
        onSuccess: (result) => {
          onReviewSummaryChange(result.reviewSummary)
          handleClose()
        },
      },
    )
  }

  if (!dialog) return null

  return (
    <DialogShell
      isOpen
      isDismissDisabled={mutation.isPending}
      onDismiss={handleClose}
      overlayClassName="bg-slate-950/40"
      contentClassName="flex h-dvh max-h-dvh w-full max-w-none flex-col overflow-hidden p-0 text-left sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:max-w-lg sm:rounded-2xl"
    >
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
            <div>
              <DialogTitle
                className="text-xl font-semibold text-slate-950"
              >
                {mode === "edit" ? "Edit review" : "Write review"}
              </DialogTitle>
              <DialogDescription
                className="mt-1 text-sm text-slate-500"
              >
                Share what was useful, accurate, or difficult.
              </DialogDescription>
            </div>

            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-950 disabled:pointer-events-none disabled:opacity-50"
              aria-label="Close review form"
              disabled={mutation.isPending}
              onClick={handleClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
          <ReviewForm
            key={initialReview?._id ?? "create-review"}
            mode={mode}
            initialReview={initialReview}
            isSubmitting={mutation.isPending}
            errorMessage={
              mutation.error instanceof Error ? mutation.error.message : ""
            }
            onSubmit={handleSubmit}
          />
          </div>
    </DialogShell>
  )
}

function ReviewsMessage({
  message,
  isLoading = false,
}: {
  message: string
  isLoading?: boolean
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center text-sm font-semibold text-slate-500">
      {isLoading && <LoaderIcon className="h-5 w-5 text-slate-400" />}
      {message}
    </div>
  )
}
