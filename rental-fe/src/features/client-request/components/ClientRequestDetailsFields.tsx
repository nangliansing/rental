import {
  CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH,
  CLIENT_REQUEST_NAME_MAX_LENGTH,
} from "../api/createOwnerClientRequest"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import type { ClientRequestDetailsErrors } from "./validateClientRequestDetails"

type ClientRequestDetailsFieldsProps = {
  name: string
  description: string
  nameId: string
  descriptionId: string
  errors?: ClientRequestDetailsErrors
  disabled?: boolean
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
}

/**
 * Shared name + notes fields for create/edit saved-search flows.
 * `description` maps to the API description field (personal notes).
 */
export function ClientRequestDetailsFields({
  name,
  description,
  nameId,
  descriptionId,
  errors,
  disabled = false,
  onNameChange,
  onDescriptionChange,
}: ClientRequestDetailsFieldsProps) {
  return (
    <div className="space-y-4">
      <FormField label="Name" required error={errors?.name} id={nameId}>
        <Input
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          maxLength={CLIENT_REQUEST_NAME_MAX_LENGTH}
          placeholder="e.g. Quiet 2BR near BTS"
          autoComplete="off"
          disabled={disabled}
        />
      </FormField>

      <FormField label="Notes" error={errors?.description} id={descriptionId}>
        <Textarea
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          maxLength={CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH}
          placeholder="Reminders for yourself — must-haves, budget notes…"
          rows={3}
          disabled={disabled}
          className="min-h-20 rounded-lg border border-slate-200 bg-white px-2.5 py-2 focus-visible:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-950/15"
        />
      </FormField>
    </div>
  )
}
