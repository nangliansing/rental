import { useEffect, useId, useState } from "react"

import type { SearchAgentProfile } from "@/features/agent"
import {
  useUpdateOwnerSavedSearch,
  type SavedSearch,
  type SavedSearchFilters,
} from "@/features/saved-search/api"
import { getFormErrorMessage } from "@/features/listing/utils/formFieldUtils"
import { toast } from "@/hooks/use-toast"
import type { MapSearchFilters } from "@/features/map-search/filters/types"
import { DialogShell } from "@/shared/components/dialogs/DialogShell"
import { ReadOnlyMap } from "@/shared/google-maps/readonly-map"

import {
  savedSearchGeoSearchToReadOnlyMapGeo,
  formatSavedSearchGeoSummary,
} from "./savedSearchDetailDisplay"
import {
  clearSavedSearchPreferenceFilters,
  removeSavedSearchSelectedLister,
  toggleSavedSearchSelectedLister,
} from "./savedSearchListerSelection"
import { SavedSearchDetailsStep } from "./SavedSearchDetailsStep"
import { SavedSearchListersStep } from "./SavedSearchListersStep"
import { SavedSearchPreferencesStep } from "./SavedSearchPreferencesStep"
import {
  SAVED_SEARCH_WIZARD_DIALOG_CONTENT_CLASSNAME,
  SavedSearchWizardLayout,
} from "./SavedSearchWizardLayout"
import { useHydrateSavedSearchSelectedListers } from "../hooks/useHydrateSavedSearchSelectedListers"
import {
  validateSavedSearchDetails,
  type SavedSearchDetailsErrors,
} from "./validateSavedSearchDetails"

type ConfirmEditSavedSearchModalProps = {
  isOpen: boolean
  savedSearch: SavedSearch | null
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

export function ConfirmEditSavedSearchModal({
  isOpen,
  savedSearch,
  onClose,
}: ConfirmEditSavedSearchModalProps) {
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
  const [draftFilters, setDraftFilters] = useState<MapSearchFilters>({})
  const [selectedListers, setSelectedListers] = useState<SearchAgentProfile[]>(
    [],
  )
  const updateMutation = useUpdateOwnerSavedSearch()

  useEffect(() => {
    if (!isOpen || !savedSearch) return

    setStep("details")
    setName(savedSearch.name)
    setDescription(savedSearch.description ?? "")
    setDetailErrors({})
    setDraftFilters(cloneFilters(savedSearch.filters))
    setSelectedListers([])
    updateMutation.reset()
    // Seed once when the dialog opens for a given request; avoid resetting mid-edit.
  }, [isOpen, savedSearch?._id, updateMutation.reset])

  useHydrateSavedSearchSelectedListers({
    enabled: isOpen && Boolean(savedSearch),
    filters: savedSearch?.filters ?? {},
    onHydrated: setSelectedListers,
  })

  if (!isOpen || !savedSearch) return null

  const isSubmitting = updateMutation.isPending
  const submitError = updateMutation.error
    ? getFormErrorMessage(
        updateMutation.error,
        "Could not save this saved search. Try again.",
      )
    : ""
  const isDetailsStep = step === "details"
  const isPreferencesStep = step === "preferences"
  const isListersStep = step === "listers"
  const geoSummary = formatSavedSearchGeoSummary(savedSearch.geoSearch)
  const previewGeo = savedSearchGeoSearchToReadOnlyMapGeo(
    savedSearch.geoSearch,
  )

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

  const handleSave = () => {
    if (isSubmitting) return

    const details = validateDetails()
    if (!details) {
      setStep("details")
      return
    }

    updateMutation.mutate(
      {
        savedSearchId: savedSearch._id,
        name: details.name,
        description: details.description,
        filters: draftFilters,
      },
      {
        onSuccess: () => {
          onClose()
          queueMicrotask(() => {
            toast({
              title: "Saved search updated",
              variant: "success-pill",
            })
          })
        },
      },
    )
  }

  const title = isDetailsStep
    ? "Edit saved search"
    : isPreferencesStep
      ? "Preferences"
      : "Preferred listers"

  const descriptionCopy = isDetailsStep
    ? "Update the name and notes. Location stays the same."
    : isPreferencesStep
      ? "Optional filters used when matching buildings to this search."
      : "Optionally limit matches to listings from selected listers."

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
        closeAriaLabel="Close edit saved search"
        headerSemantics="dialog"
        hero={
          isDetailsStep ? (
            <ReadOnlyMap
              geo={previewGeo}
              navigable
              className="h-full w-full"
              mapInstanceId={`confirm-edit-saved-search-${savedSearch._id}`}
              emptyMessage="Selected location is unavailable."
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
            summaryTitle={geoSummary.title}
            summaryDetail={geoSummary.detail}
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
            primaryLabel="Save"
            primaryPendingLabel="Saving…"
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
            onPrimary={handleSave}
          />
        )}
      </SavedSearchWizardLayout>
    </DialogShell>
  )
}
