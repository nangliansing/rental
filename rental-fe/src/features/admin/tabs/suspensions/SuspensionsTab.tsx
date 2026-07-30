import { useState } from "react"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"

import {
  adminQueries,
  useLiftAdminSuspension,
  type AdminSuspensionListItem,
  type AdminSuspensionStatusFilter,
} from "../../api"
import {
  AdminFilterPills,
  AdminWorkspace,
} from "../../components"
import { AdminDetailState } from "../../components/AdminDetailState"
import {
  AdminEmptyState,
  AdminListState,
} from "../../components/AdminListState"
import { SuspensionDetail } from "./SuspensionDetail"
import { SuspensionLiftDialog } from "./SuspensionLiftDialog"
import { SuspensionListItem } from "./SuspensionListItem"
import {
  SuspensionReviewContext,
  type LiftSuspensionAction,
  type SuspensionReviewContextValue,
} from "./SuspensionReviewContext"
import { suspensionStatusFilters } from "./suspensionReasonOptions"

export type SuspensionsTabProps = {
  enabled: boolean
}

export function SuspensionsTab({ enabled }: SuspensionsTabProps) {
  const [status, setStatus] = useState<AdminSuspensionStatusFilter>("ACTIVE")
  const [selectedSuspensionId, setSelectedSuspensionId] = useState<
    string | null
  >(null)
  const [liftAction, setLiftAction] = useState<LiftSuspensionAction>(null)
  const [liftReason, setLiftReason] = useState("")
  const [liftNote, setLiftNote] = useState("")
  const [liftError, setLiftError] = useState<string | null>(null)

  const suspensionsQuery = useInfiniteQuery(
    adminQueries.suspensions(status, enabled),
  )

  const liftSuspensionMutation = useLiftAdminSuspension()

  const suspensions =
    suspensionsQuery.data?.pages.flatMap((page) => page.data) ?? []
  const pagination = suspensionsQuery.data?.pages[0]?.pagination
  const selectedSuspensionListItem =
    suspensions.find((suspension) => suspension._id === selectedSuspensionId) ??
    suspensions[0] ??
    null
  const effectiveSuspensionId =
    selectedSuspensionId ?? selectedSuspensionListItem?._id

  const suspensionDetailQuery = useQuery(
    adminQueries.suspensionDetail(effectiveSuspensionId, enabled),
  )

  const selectedSuspension =
    suspensionDetailQuery.data ?? selectedSuspensionListItem ?? null

  const closeLiftDialog = () => {
    setLiftAction(null)
    setLiftReason("")
    setLiftNote("")
    setLiftError(null)
  }

  const handleOpenLiftDialog = (suspension: AdminSuspensionListItem) => {
    setLiftAction(suspension)
    setLiftReason("")
    setLiftNote("")
    setLiftError(null)
  }

  const handleConfirmLiftSuspension = () => {
    if (!liftAction || liftSuspensionMutation.isPending) return

    const trimmedReason = liftReason.trim()
    const trimmedNote = liftNote.trim()

    if (!trimmedReason && !trimmedNote) {
      setLiftError("Lift reason is required.")
      return
    }

    const combinedLiftReason = trimmedReason
      ? [trimmedReason, trimmedNote && `Note: ${trimmedNote}`]
          .filter(Boolean)
          .join("\n\n")
      : trimmedNote

    liftSuspensionMutation.mutate(
      {
        suspensionId: liftAction._id,
        userId: liftAction.userId,
        liftReason: combinedLiftReason,
      },
      {
        onSuccess: (result) => {
          setSelectedSuspensionId(result.suspension._id)
          closeLiftDialog()
        },
        onError: (error) => {
          setLiftError(
            error instanceof Error ? error.message : "Could not lift suspension.",
          )
        },
      },
    )
  }

  const contextValue: SuspensionReviewContextValue = {
    selectedSuspension,
    liftAction,
    liftReason,
    liftNote,
    liftError,
    isLifting: liftSuspensionMutation.isPending,
    selectSuspension: setSelectedSuspensionId,
    openLiftDialog: handleOpenLiftDialog,
    closeLiftDialog,
    setLiftReason: (value) => {
      setLiftReason(value)
      if (liftError) setLiftError(null)
    },
    setLiftNote: (value) => {
      setLiftNote(value)
      if (liftError) setLiftError(null)
    },
    confirmLiftSuspension: handleConfirmLiftSuspension,
  }

  return (
    <SuspensionReviewContext.Provider value={contextValue}>
      <AdminWorkspace
        title="Suspensions"
        description="Review active and historical account restrictions."
        total={pagination?.total}
        filters={
          <AdminFilterPills
            options={suspensionStatusFilters}
            value={status}
            scrollable
            onChange={(nextStatus) => {
              setStatus(nextStatus ?? "all")
              setSelectedSuspensionId(null)
            }}
          />
        }
        list={
          <AdminListState
            isLoading={suspensionsQuery.isLoading}
            error={suspensionsQuery.error}
            errorFallback="Could not load suspensions."
            isEmpty={suspensions.length === 0}
            emptyTitle="No suspensions"
            emptyDescription="Suspension records will appear here after an admin restricts a lister."
            onRetry={() => void suspensionsQuery.refetch()}
            hasNextPage={Boolean(suspensionsQuery.hasNextPage)}
            isFetchingNextPage={suspensionsQuery.isFetchingNextPage}
            onFetchNextPage={() => void suspensionsQuery.fetchNextPage()}
          >
            {suspensions.map((suspension) => (
              <SuspensionListItem
                key={suspension._id}
                suspension={suspension}
              />
            ))}
          </AdminListState>
        }
        detail={
          <AdminDetailState
            isLoading={suspensionDetailQuery.isLoading}
            shouldShowLoading={Boolean(effectiveSuspensionId)}
            error={suspensionDetailQuery.error}
            errorFallback="Could not load this suspension."
            onRetry={() => void suspensionDetailQuery.refetch()}
          >
            {selectedSuspension ? (
              <SuspensionDetail suspension={selectedSuspension} />
            ) : (
              <AdminEmptyState
                title="Select a suspension"
                description="Choose a suspension record from the left to inspect who was restricted and why."
              />
            )}
          </AdminDetailState>
        }
      />
      <SuspensionLiftDialog />
    </SuspensionReviewContext.Provider>
  )
}
