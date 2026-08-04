import type { FormEvent, ReactNode } from "react"

import { Button } from "@/components/ui/button"

import { ClientRequestDetailsFields } from "./ClientRequestDetailsFields"
import { ClientRequestGeoSummaryCard } from "./ClientRequestGeoSummaryCard"
import type { ClientRequestDetailsErrors } from "./validateClientRequestDetails"

type ClientRequestDetailsStepProps = {
  formId: string
  nameId: string
  descriptionId: string
  name: string
  description: string
  errors?: ClientRequestDetailsErrors
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
export function ClientRequestDetailsStep({
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
}: ClientRequestDetailsStepProps) {
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
        <ClientRequestGeoSummaryCard
          title={summaryTitle}
          detail={summaryDetail}
        />
        <ClientRequestDetailsFields
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

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
        {footerStart}
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
        <Button type="submit" disabled={disabled}>
          {continueLabel}
        </Button>
      </div>
    </form>
  )
}
