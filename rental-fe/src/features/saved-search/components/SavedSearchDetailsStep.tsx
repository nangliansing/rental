import type { FormEvent, ReactNode } from "react"

import { Button } from "@/components/ui/button"

import { SavedSearchDetailsFields } from "./SavedSearchDetailsFields"
import { SavedSearchGeoSummaryCard } from "./SavedSearchGeoSummaryCard"
import { SAVED_SEARCH_WIZARD_ACTION_BUTTON_CLASSNAME } from "./SavedSearchWizardLayout"
import type { SavedSearchDetailsErrors } from "./validateSavedSearchDetails"

type SavedSearchDetailsStepProps = {
  formId: string
  nameId: string
  descriptionId: string
  name: string
  description: string
  errors?: SavedSearchDetailsErrors
  summaryTitle: string
  summaryDetail: string
  disabled?: boolean
  cancelLabel?: string
  continueLabel?: string
  footerStart?: ReactNode
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onCancel: () => void
  onContinue: () => void
}

/** Details + geo summary step shared by map modal, create page, and edit page. */
export function SavedSearchDetailsStep({
  formId,
  nameId,
  descriptionId,
  name,
  description,
  errors,
  summaryTitle,
  summaryDetail,
  disabled = false,
  cancelLabel = "Cancel",
  continueLabel = "Continue",
  footerStart,
  onNameChange,
  onDescriptionChange,
  onCancel,
  onContinue,
}: SavedSearchDetailsStepProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (disabled) return
    onContinue()
  }

  return (
    <form
      id={formId}
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <SavedSearchGeoSummaryCard
          title={summaryTitle}
          detail={summaryDetail}
        />
        <SavedSearchDetailsFields
          name={name}
          description={description}
          nameId={nameId}
          descriptionId={descriptionId}
          errors={errors}
          disabled={disabled}
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
        />
      </div>

      <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 px-5 py-4">
        {footerStart}
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={SAVED_SEARCH_WIZARD_ACTION_BUTTON_CLASSNAME}
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
        <Button
          type="submit"
          disabled={disabled}
          className={SAVED_SEARCH_WIZARD_ACTION_BUTTON_CLASSNAME}
        >
          {continueLabel}
        </Button>
      </div>
    </form>
  )
}
