import { useEffect, useId, useState } from "react"

import {
  useCreateOwnerClientRequest,
  type ClientRequestFilters,
} from "@/features/client-request/api"
import {
  CLIENT_REQUEST_WIZARD_DIALOG_CONTENT_CLASSNAME,
  ClientRequestDetailsStep,
  ClientRequestPreferencesStep,
  ClientRequestWizardLayout,
  validateClientRequestDetails,
  type ClientRequestDetailsErrors,
} from "@/features/client-request/components"
import { toast } from "@/hooks/use-toast"
import { DialogShell } from "@/shared/components/dialogs/DialogShell"
import { ReadOnlyMap } from "@/shared/google-maps/readonly-map"

import type { MapSearchFilters } from "../../filters/types"
import type { MapClientRequestGeoSnapshot } from "../../utils/client-request-geo-from-map"

type ConfirmCreateClientRequestModalProps = {
  isOpen: boolean
  snapshot: MapClientRequestGeoSnapshot | null
  /** Seed preferences from the current map search (kept local to this modal). */
  filters: ClientRequestFilters
  onClose: () => void
}

type ModalStep = "details" | "preferences"

function cloneFilters(filters: ClientRequestFilters): MapSearchFilters {
  return { ...filters }
}

export function ConfirmCreateClientRequestModal({
  isOpen,
  snapshot,
  filters,
  onClose,
}: ConfirmCreateClientRequestModalProps) {
  const formId = useId()
  const nameId = `${formId}-name`
  const descriptionId = `${formId}-description`
  const availableByFieldId = `${formId}-available-by`
  const [step, setStep] = useState<ModalStep>("details")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [detailErrors, setDetailErrors] = useState<ClientRequestDetailsErrors>(
    {},
  )
  const [draftFilters, setDraftFilters] = useState<MapSearchFilters>(() =>
    cloneFilters(filters),
  )
  const createMutation = useCreateOwnerClientRequest()

  useEffect(() => {
    if (!isOpen) return
    setStep("details")
    setName("")
    setDescription("")
    setDetailErrors({})
    setDraftFilters(cloneFilters(filters))
    createMutation.reset()
  }, [isOpen, filters, createMutation.reset])

  if (!isOpen || !snapshot) return null

  const isSubmitting = createMutation.isPending
  const submitError =
    createMutation.error instanceof Error ? createMutation.error.message : ""
  const isDetailsStep = step === "details"

  const handleClose = () => {
    if (isSubmitting) return
    onClose()
  }

  const validateDetails = () => {
    const result = validateClientRequestDetails({ name, description })
    if (!result.ok) {
      setDetailErrors(result.errors)
      return null
    }
    setDetailErrors({})
    return result.value
  }

  const handleContinue = () => {
    if (isSubmitting) return
    if (!validateDetails()) return
    setStep("preferences")
  }

  const handleCreate = () => {
    if (isSubmitting) return

    const details = validateDetails()
    if (!details) {
      setStep("details")
      return
    }

    createMutation.mutate(
      {
        name: details.name,
        description: details.description,
        geoSearch: snapshot.geoSearch,
        filters: draftFilters,
      },
      {
        onSuccess: () => {
          onClose()
          // Toast lives under `#root`; while DialogShell is open Radix hides that
          // tree, so show the success toast after the dialog has closed.
          queueMicrotask(() => {
            toast({
              title: "Client request created",
              variant: "success-pill",
            })
          })
        },
      },
    )
  }

  return (
    <DialogShell
      isOpen
      isDismissDisabled={isSubmitting}
      onDismiss={handleClose}
      overlayClassName="bg-slate-950/40"
      contentClassName={CLIENT_REQUEST_WIZARD_DIALOG_CONTENT_CLASSNAME}
    >
      <ClientRequestWizardLayout
        step={isDetailsStep ? 1 : 2}
        title={
          isDetailsStep ? "Create client request" : "Client preferences"
        }
        description={
          isDetailsStep
            ? "Confirm the search area, then name the request."
            : "Optional filters used to match listings for this client."
        }
        onClose={handleClose}
        closeDisabled={isSubmitting}
        closeAriaLabel="Close create client request"
        headerSemantics="dialog"
        hero={
          isDetailsStep ? (
            <ReadOnlyMap
              geo={snapshot.previewGeo}
              navigable
              className="h-full w-full"
              mapInstanceId="confirm-create-client-request-map"
              emptyMessage="Selected area is unavailable."
            />
          ) : undefined
        }
      >
        {isDetailsStep ? (
          <ClientRequestDetailsStep
            formId={formId}
            nameId={nameId}
            descriptionId={descriptionId}
            name={name}
            description={description}
            errors={detailErrors}
            summaryTitle={snapshot.summaryTitle}
            summaryDetail={snapshot.summaryDetail}
            disabled={isSubmitting}
            onNameChange={(value) => {
              setName(value)
              if (detailErrors.name) {
                setDetailErrors((current) => ({
                  ...current,
                  name: undefined,
                }))
              }
            }}
            onDescriptionChange={(value) => {
              setDescription(value)
              if (detailErrors.description) {
                setDetailErrors((current) => ({
                  ...current,
                  description: undefined,
                }))
              }
            }}
            onCancel={handleClose}
            onContinue={handleContinue}
          />
        ) : (
          <ClientRequestPreferencesStep
            filters={draftFilters}
            availableByFieldId={availableByFieldId}
            disabled={isSubmitting}
            submitError={submitError}
            onFiltersChange={setDraftFilters}
            onBack={() => setStep("details")}
            onClear={() => setDraftFilters({})}
            onPrimary={handleCreate}
          />
        )}
      </ClientRequestWizardLayout>
    </DialogShell>
  )
}
