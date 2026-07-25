import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"

import { Trash2 } from "lucide-react"

import type { SearchListing } from "@/features/map-search/types"
import {
  useCreateListingReport,
  type ReportReason,
} from "@/features/reports/api"
import { ConfirmationDialog } from "@/shared/components/dialogs/ConfirmationDialog"

import { useDeleteOwnerListing, useUpdateOwnerListing } from "../api"
import type { ListingVisibility } from "../types"
import { EditPrivacyDialog } from "./EditPrivacyDialog"
import { ListerReviewsDialog } from "./ListerReviewsDialog"
import { ReportListingDialog } from "./ReportListingDialog"

const REPORT_SUCCESS_DURATION_MS = 1200

export type ListingPostCardDialogActions = {
  openDeleteDialog: () => void
  openPrivacyDialog: () => void
  openReportDialog: () => void
  openReviewsDialog: () => void
}

type ListingPostCardDialogHostProps = {
  listing: SearchListing
  currentVisibility: ListingVisibility
  onDeleted?: (listing: SearchListing) => void
  onDeleteStarted?: () => void
  onDeleteFailed?: () => void
  onVisibilityUpdated?: (visibility: ListingVisibility) => void
}

export const ListingPostCardDialogHost = forwardRef<
  ListingPostCardDialogActions,
  ListingPostCardDialogHostProps
>(function ListingPostCardDialogHost(
  {
    listing,
    currentVisibility,
    onDeleted,
    onDeleteStarted,
    onDeleteFailed,
    onVisibilityUpdated,
  },
  ref,
) {
  const reportCloseTimerRef = useRef<number | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  const [isReviewsDialogOpen, setIsReviewsDialogOpen] = useState(false)
  const [isPrivacyDialogOpen, setIsPrivacyDialogOpen] = useState(false)
  const [privacyError, setPrivacyError] = useState("")
  const [selectedReportReason, setSelectedReportReason] =
    useState<ReportReason | null>(null)
  const [reportNote, setReportNote] = useState("")
  const [reportError, setReportError] = useState("")
  const [reportSuccessMessage, setReportSuccessMessage] = useState("")

  const deleteMutation = useDeleteOwnerListing()
  const updateListingMutation = useUpdateOwnerListing()
  const reportMutation = useCreateListingReport()
  const agent = listing.agentProfile

  const clearReportCloseTimer = useCallback(() => {
    if (reportCloseTimerRef.current === null) return

    window.clearTimeout(reportCloseTimerRef.current)
    reportCloseTimerRef.current = null
  }, [])

  const resetReportState = useCallback(() => {
    clearReportCloseTimer()
    setSelectedReportReason(null)
    setReportNote("")
    setReportError("")
    setReportSuccessMessage("")
  }, [clearReportCloseTimer])

  useEffect(() => clearReportCloseTimer, [clearReportCloseTimer])

  useImperativeHandle(
    ref,
    () => ({
      openDeleteDialog: () => {
        setDeleteError("")
        setIsDeleteDialogOpen(true)
      },
      openPrivacyDialog: () => {
        setPrivacyError("")
        setIsPrivacyDialogOpen(true)
      },
      openReportDialog: () => {
        resetReportState()
        setIsReportDialogOpen(true)
      },
      openReviewsDialog: () => {
        setIsReviewsDialogOpen(true)
      },
    }),
    [resetReportState],
  )

  const deleteListing = () => {
    onDeleteStarted?.()
    deleteMutation.mutate(listing._id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false)
        setDeleteError("")
        onDeleted?.(listing)
      },
      onError: (error) => {
        onDeleteFailed?.()
        setDeleteError(
          error instanceof Error ? error.message : "Could not delete listing.",
        )
      },
    })
  }

  const updatePrivacy = (visibility: ListingVisibility) => {
    updateListingMutation.mutate(
      { listingId: listing._id, values: { visibility } },
      {
        onSuccess: (updatedListing) => {
          onVisibilityUpdated?.(updatedListing.visibility)
          setPrivacyError("")
          setIsPrivacyDialogOpen(false)
        },
        onError: (error) => {
          setPrivacyError(
            error instanceof Error
              ? error.message
              : "Could not update listing privacy. Try again.",
          )
        },
      },
    )
  }

  const closeReportDialog = () => {
    if (reportMutation.isPending) return

    setIsReportDialogOpen(false)
    resetReportState()
  }

  return (
    <>
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        title="Delete this listing?"
        description={
          <p>
            This will remove it from public search and your listings. You can
            create a new listing again later.
          </p>
        }
        confirmLabel="Delete"
        tone="danger"
        icon={<Trash2 className="h-5 w-5 text-rose-600" />}
        error={deleteError}
        isSubmitting={deleteMutation.isPending}
        closeAriaLabel="Close delete confirmation"
        onClose={() => {
          if (deleteMutation.isPending) return

          setIsDeleteDialogOpen(false)
          setDeleteError("")
        }}
        onConfirm={deleteListing}
      />

      <EditPrivacyDialog
        currentVisibility={currentVisibility}
        errorMessage={privacyError}
        isOpen={isPrivacyDialogOpen}
        isSubmitting={updateListingMutation.isPending}
        onClose={() => {
          if (updateListingMutation.isPending) return

          setIsPrivacyDialogOpen(false)
          setPrivacyError("")
        }}
        onSubmit={(visibility) => {
          if (
            updateListingMutation.isPending ||
            visibility === currentVisibility
          ) {
            return
          }

          setPrivacyError("")
          updatePrivacy(visibility)
        }}
      />

      <ReportListingDialog
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
              listingId: listing._id,
              reason: selectedReportReason,
              note: reportNote,
            },
            {
              onSuccess: () => {
                setReportError("")
                setReportSuccessMessage(
                  "Report sent. Our team will review it.",
                )
                clearReportCloseTimer()
                reportCloseTimerRef.current = window.setTimeout(() => {
                  setIsReportDialogOpen(false)
                  resetReportState()
                }, REPORT_SUCCESS_DURATION_MS)
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

      {agent && (
        <ListerReviewsDialog
          agent={agent}
          isOpen={isReviewsDialogOpen}
          onClose={() => setIsReviewsDialogOpen(false)}
        />
      )}
    </>
  )
})
