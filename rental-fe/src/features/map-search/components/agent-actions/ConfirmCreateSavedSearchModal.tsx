import { useEffect, useId, useState } from "react"

import type { SearchAgentProfile } from "@/features/agent"
import {
  useCreateOwnerSavedSearch,
  type SavedSearchFilters,
} from "@/features/saved-search/api"
import {
  SAVED_SEARCH_WIZARD_DIALOG_CONTENT_CLASSNAME,
  SavedSearchDetailsStep,
  SavedSearchListersStep,
  SavedSearchPreferencesStep,
  SavedSearchWizardLayout,
  validateSavedSearchDetails,
  type SavedSearchDetailsErrors,
} from "@/features/saved-search/components"
import {
  clearSavedSearchPreferenceFilters,
  removeSavedSearchSelectedLister,
  toggleSavedSearchSelectedLister,
} from "@/features/saved-search/components/savedSearchListerSelection"
import { useHydrateSavedSearchSelectedListers } from "@/features/saved-search/hooks/useHydrateSavedSearchSelectedListers"
import { toast } from "@/hooks/use-toast"
import { DialogShell } from "@/shared/components/dialogs/DialogShell"
import { ReadOnlyMap } from "@/shared/google-maps/readonly-map"

import type { MapSearchFilters } from "../../filters/types"
import type { MapSavedSearchGeoSnapshot } from "../../utils/saved-search-geo-from-map"
import { CREATE_SAVED_SEARCH_COPY } from "./agentMapActionsCopy"

type ConfirmCreateSavedSearchModalProps = {
  isOpen: boolean
  snapshot: MapSavedSearchGeoSnapshot | null
  /** Seed preferences from the current map search (kept local to this modal). */
  filters: SavedSearchFilters
  onClose: () => void
}

type ModalStep = "details" | "preferences" | "listers"

function cloneFilters(filters: SavedSearchFilters): MapSearchFilters {
  return { ...filters }
}

function wizardStepNumber(step: ModalStep): 1 | 2 | 3 {
  if (step === "details") return 1
  if (step === "preferences") return 2
  return 3
}

export function ConfirmCreateSavedSearchModal({
  isOpen,
  snapshot,
  filters,
  onClose,
}: ConfirmCreateSavedSearchModalProps) {
  const formId = useId()
  const nameId = `${formId}-name`
  const descriptionId = `${formId}-description`
  const availableByFieldId = `${formId}-available-by`
  const [step, setStep] = useState<ModalStep>("details")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [detailErrors, setDetailErrors] = useState<SavedSearchDetailsErrors>(
    {},
  )
  const [draftFilters, setDraftFilters] = useState<MapSearchFilters>(() =>
    cloneFilters(filters),
  )
  const [selectedListers, setSelectedListers] = useState<SearchAgentProfile[]>(
    [],
  )
  const createMutation = useCreateOwnerSavedSearch()

  useEffect(() => {
    if (!isOpen) return
    setStep("details")
    setName("")
    setDescription("")
    setDetailErrors({})
    setDraftFilters(cloneFilters(filters))
    setSelectedListers([])
    createMutation.reset()
  }, [isOpen, filters, createMutation.reset])

  useHydrateSavedSearchSelectedListers({
    enabled: isOpen,
    filters,
    onHydrated: setSelectedListers,
  })

  if (!isOpen || !snapshot) return null

  const isSubmitting = createMutation.isPending
  const submitError =
    createMutation.error instanceof Error ? createMutation.error.message : ""
  const isDetailsStep = step === "details"
  const isPreferencesStep = step === "preferences"
  const isListersStep = step === "listers"

  const handleClose = () => {
    if (isSubmitting) return
    onClose()
  }

  const validateDetails = () => {
    const result = validateSavedSearchDetails({ name, description })
    if (!result.ok) {
      setDetailErrors(result.errors)
      return null
    }
    setDetailErrors({})
    return result.value
  }

  const handleContinueFromDetails = () => {
    if (isSubmitting) return
    if (!validateDetails()) return
    setStep("preferences")
  }

  const handleContinueFromPreferences = () => {
    if (isSubmitting) return
    setStep("listers")
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
          queueMicrotask(() => {
            toast({
              title: CREATE_SAVED_SEARCH_COPY.successToastTitle,
              variant: "success-pill",
            })
          })
        },
      },
    )
  }

  const title = isDetailsStep
    ? CREATE_SAVED_SEARCH_COPY.detailsTitle
    : isPreferencesStep
      ? CREATE_SAVED_SEARCH_COPY.preferencesTitle
      : CREATE_SAVED_SEARCH_COPY.listersTitle

  const descriptionCopy = isDetailsStep
    ? CREATE_SAVED_SEARCH_COPY.detailsDescription
    : isPreferencesStep
      ? CREATE_SAVED_SEARCH_COPY.preferencesDescription
      : CREATE_SAVED_SEARCH_COPY.listersDescription

  return (
    <DialogShell
      isOpen
      isDismissDisabled={isSubmitting}
      onDismiss={handleClose}
      overlayClassName="bg-slate-950/40"
      contentClassName={SAVED_SEARCH_WIZARD_DIALOG_CONTENT_CLASSNAME}
    >
      <SavedSearchWizardLayout
        step={wizardStepNumber(step)}
        title={title}
        description={descriptionCopy}
        onClose={handleClose}
        closeDisabled={isSubmitting}
        closeAriaLabel={CREATE_SAVED_SEARCH_COPY.closeAriaLabel}
        headerSemantics="dialog"
        hero={
          isDetailsStep ? (
            <ReadOnlyMap
              geo={snapshot.previewGeo}
              navigable
              className="h-full w-full"
              mapInstanceId="confirm-create-saved-search-map"
              emptyMessage="Selected area is unavailable."
            />
          ) : undefined
        }
      >
        {isDetailsStep ? (
          <SavedSearchDetailsStep
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
            onContinue={handleContinueFromDetails}
          />
        ) : isPreferencesStep ? (
          <SavedSearchPreferencesStep
            filters={draftFilters}
            availableByFieldId={availableByFieldId}
            disabled={isSubmitting}
            primaryLabel="Continue"
            onFiltersChange={setDraftFilters}
            onBack={() => setStep("details")}
            onClear={() =>
              setDraftFilters(clearSavedSearchPreferenceFilters(draftFilters))
            }
            onPrimary={handleContinueFromPreferences}
          />
        ) : (
          <SavedSearchListersStep
            selectedListers={selectedListers}
            disabled={isSubmitting}
            submitError={isListersStep ? submitError : undefined}
            primaryLabel={CREATE_SAVED_SEARCH_COPY.createLabel}
            primaryPendingLabel={CREATE_SAVED_SEARCH_COPY.creatingLabel}
            onToggleLister={(lister) => {
              const next = toggleSavedSearchSelectedLister(
                selectedListers,
                draftFilters,
                lister,
              )
              setSelectedListers(next.selectedListers)
              setDraftFilters(next.filters)
            }}
            onRemoveLister={(listerId) => {
              const next = removeSavedSearchSelectedLister(
                selectedListers,
                draftFilters,
                listerId,
              )
              setSelectedListers(next.selectedListers)
              setDraftFilters(next.filters)
            }}
            onBack={() => setStep("preferences")}
            onPrimary={handleCreate}
          />
        )}
      </SavedSearchWizardLayout>
    </DialogShell>
  )
}
