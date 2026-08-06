import { useState } from "react"
import type { RefObject } from "react"
import { Trash2 } from "lucide-react"

import type { ClientRequest } from "@/features/client-request/api"
import {
  useDeleteOwnerClientRequest,
  useUpdateOwnerClientRequestStatus,
} from "@/features/client-request/api"
import { getFormErrorMessage } from "@/features/listing/utils/formFieldUtils"
import { cn } from "@/lib/utils"
import { ConfirmationDialog } from "@/shared/components/dialogs/ConfirmationDialog"

import { ClientRequestDetailFiltersSection } from "./ClientRequestDetailFiltersSection"
import { ClientRequestDetailHeader } from "./ClientRequestDetailHeader"
import { ClientRequestDetailListersSection } from "./ClientRequestDetailListersSection"
import { ClientRequestDetailLocationSection } from "./ClientRequestDetailLocationSection"
import { ClientRequestMatchingBuildingsSection } from "./ClientRequestMatchingBuildingsSection"
import { ConfirmEditClientRequestModal } from "./ConfirmEditClientRequestModal"

type ClientRequestDetailPaneProps = {
  selected: ClientRequest | null
  className?: string
  scrollRootRef?: RefObject<HTMLElement | null>
  /** Clears selection after a successful close or delete. */
  onRequestRemoved?: (clientRequestId: string) => void
}

export function ClientRequestDetailPane({
  selected,
  className,
  scrollRootRef,
  onRequestRemoved,
}: ClientRequestDetailPaneProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [closeError, setCloseError] = useState("")

  const closeMutation = useUpdateOwnerClientRequestStatus()
  const deleteMutation = useDeleteOwnerClientRequest()

  if (!selected) {
    return (
      <div
        className={
          className ??
          "flex h-full min-h-48 items-center justify-center px-6 text-center"
        }
      >
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            Select a saved search
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Choose a search from the list to see its location, filters, and any
            matching buildings.
          </p>
        </div>
      </div>
    )
  }

  const isBusy = closeMutation.isPending || deleteMutation.isPending

  const handleCloseRequest = () => {
    if (selected.status === "Closed" || closeMutation.isPending) return

    setCloseError("")
    closeMutation.mutate(
      {
        clientRequestId: selected._id,
        status: "Closed",
      },
      {
        onSuccess: () => {
          onRequestRemoved?.(selected._id)
        },
        onError: (error) => {
          setCloseError(
            getFormErrorMessage(
              error,
              "Could not close this saved search. Try again.",
            ),
          )
        },
      },
    )
  }

  const handleConfirmDelete = () => {
    if (deleteMutation.isPending) return

    setDeleteError("")
    deleteMutation.mutate(
      { clientRequestId: selected._id },
      {
        onSuccess: () => {
          setIsDeleteDialogOpen(false)
          onRequestRemoved?.(selected._id)
        },
        onError: (error) => {
          setDeleteError(
            getFormErrorMessage(
              error,
              "Could not delete this saved search. Try again.",
            ),
          )
        },
      },
    )
  }

  return (
    <>
      <div className={cn("space-y-6 px-4 py-5 sm:px-6", className)}>
        <ClientRequestDetailHeader
          clientRequest={selected}
          actionsDisabled={isBusy}
          onEditRequest={() => {
            if (selected.status === "Closed") return
            setIsEditDialogOpen(true)
          }}
          onCloseRequest={handleCloseRequest}
          onDeleteRequest={() => {
            setDeleteError("")
            setIsDeleteDialogOpen(true)
          }}
        />

        {closeError ? (
          <p
            className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600"
            role="alert"
          >
            {closeError}
          </p>
        ) : null}

        <ClientRequestDetailLocationSection
          geoSearch={selected.geoSearch}
          mapInstanceId={`client-request-detail-${selected._id}`}
        />

        <ClientRequestDetailFiltersSection filters={selected.filters} />

        <ClientRequestDetailListersSection filters={selected.filters} />

        <ClientRequestMatchingBuildingsSection
          geoSearch={selected.geoSearch}
          filters={selected.filters}
          scrollRootRef={scrollRootRef}
        />
      </div>

      <ConfirmEditClientRequestModal
        isOpen={isEditDialogOpen}
        clientRequest={selected}
        onClose={() => setIsEditDialogOpen(false)}
      />

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        title="Delete this saved search?"
        description={
          <p>
            This permanently removes{" "}
            <span className="font-medium text-slate-700">{selected.name}</span>{" "}
            from your saved searches. This cannot be undone.
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
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}
