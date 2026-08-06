import { ChevronLeft } from "lucide-react"

import type { SearchAgentProfile } from "@/features/agent"
import { Button } from "@/components/ui/button"
import { ListerPickerPanel } from "@/features/lister-picker"
import { cn } from "@/lib/utils"
import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"

import { SAVED_SEARCH_WIZARD_ACTION_BUTTON_CLASSNAME } from "./SavedSearchWizardLayout"

type SavedSearchListersStepProps = {
  selectedListers: SearchAgentProfile[]
  disabled?: boolean
  submitError?: string
  primaryLabel?: string
  primaryPendingLabel?: string
  currentUserAgentProfileId?: string | null
  onToggleLister: (lister: SearchAgentProfile) => void
  onRemoveLister: (listerId: string) => void
  onBack: () => void
  onPrimary: () => void
}

/** Third wizard step: pick listers for `filters.agentProfileIds`. */
export function SavedSearchListersStep({
  selectedListers,
  disabled = false,
  submitError,
  primaryLabel = "Save search",
  primaryPendingLabel = "Creating…",
  currentUserAgentProfileId = null,
  onToggleLister,
  onRemoveLister,
  onBack,
  onPrimary,
}: SavedSearchListersStepProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Padding lives on picker content so the scroll thumb stays flush to the edges. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-4">
        <ListerPickerPanel
          selectedListers={selectedListers}
          currentUserAgentProfileId={currentUserAgentProfileId}
          onToggleLister={onToggleLister}
          onRemoveLister={onRemoveLister}
          className={cn(
            "min-h-0 flex-1",
            disabled && "pointer-events-none opacity-60",
          )}
        />

        {submitError ? (
          <p
            className="mt-3 shrink-0 px-5 text-sm font-medium text-red-600"
            role="alert"
          >
            {submitError}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label="Back"
          className="h-12 w-12 rounded-full"
          onClick={onBack}
        >
          <ChevronLeft className="size-8" aria-hidden="true" />
        </Button>

        <Button
          type="button"
          disabled={disabled}
          className={SAVED_SEARCH_WIZARD_ACTION_BUTTON_CLASSNAME}
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
  )
}
