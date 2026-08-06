import type { ReactNode } from "react"
import { ChevronLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { MapSearchFiltersForm } from "@/features/map-search/components/filters/MapSearchFiltersForm"
import type { MapSearchFilters } from "@/features/map-search/filters/types"
import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"

import type { ClientRequestFilters } from "../api"
import { CLIENT_REQUEST_WIZARD_ACTION_BUTTON_CLASSNAME } from "./ClientRequestWizardLayout"

type ClientRequestPreferencesStepProps = {
  filters: ClientRequestFilters | MapSearchFilters
  availableByFieldId: string
  disabled?: boolean
  submitError?: string
  backLabel?: string
  clearLabel?: string
  primaryLabel?: string
  primaryPendingLabel?: string
  footerStart?: ReactNode
  onFiltersChange: (filters: MapSearchFilters) => void
  onBack: () => void
  onClear: () => void
  onPrimary: () => void
}

/** Preferences / filters step shared by map modal, create page, and edit page. */
export function ClientRequestPreferencesStep({
  filters,
  availableByFieldId,
  disabled = false,
  submitError,
  backLabel = "Back",
  clearLabel = "Clear",
  primaryLabel = "Continue",
  primaryPendingLabel = "Working…",
  footerStart,
  onFiltersChange,
  onBack,
  onClear,
  onPrimary,
}: ClientRequestPreferencesStepProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <MapSearchFiltersForm
          value={filters}
          onChange={onFiltersChange}
          availableByFieldId={availableByFieldId}
          disabled={disabled}
        />

        {submitError ? (
          <p className="mt-4 text-sm font-medium text-red-600" role="alert">
            {submitError}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          {footerStart}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-label={backLabel}
            className="h-12 w-12 rounded-full"
            onClick={onBack}
          >
            <ChevronLeft className="size-8" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            className={CLIENT_REQUEST_WIZARD_ACTION_BUTTON_CLASSNAME}
            onClick={onClear}
          >
            {clearLabel}
          </Button>
          <Button
            type="button"
            disabled={disabled}
            className={CLIENT_REQUEST_WIZARD_ACTION_BUTTON_CLASSNAME}
            onClick={onPrimary}
          >
            {disabled ? (
              <>
                <LoaderIcon className="h-5 w-5" aria-hidden="true" />
                {primaryPendingLabel}
              </>
            ) : (
              primaryLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
