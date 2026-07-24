import { useId, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { getFormErrorMessage } from "@/features/listing/utils/formFieldUtils"
import { MultiOptionSelector } from "@/shared/components/inputs/MultiOptionSelector"
import { SUPPORT_LANGUAGE_OPTIONS } from "@/shared/options/rental-options"

import type { MediaUploaderState } from "../../uploads/components/MediaUploader"
import { AvatarUploader } from "../../uploads/components/AvatarUploader"
import { AGENT_CONTACT_FORM_FIELDS } from "../utils/contactFieldDefinitions"
import {
  buildAgentProfileFormValues,
  buildChangedAgentProfileValues,
  hasAgentContactMethod,
  normalizeAgentProfileFormValues,
  type AgentProfileFormValues,
} from "../utils/agentProfileFormUtils"

export type { AgentProfileFormValues } from "../utils/agentProfileFormUtils"

export type AgentProfileFormMode = "create" | "edit"

export type AgentProfileFormSubmitValues =
  | AgentProfileFormValues
  | Partial<AgentProfileFormValues>

type ProfileTextField = Exclude<
  keyof AgentProfileFormValues,
  "profilePhoto" | "supportLanguages"
>

type AgentProfileFormBaseProps = {
  defaultValues?: Partial<AgentProfileFormValues>
}

type AgentProfileFormProps = AgentProfileFormBaseProps &
  (
    | {
        mode?: "create"
        onSubmit?: (values: AgentProfileFormValues) => void | Promise<void>
      }
    | {
        mode: "edit"
        onSubmit?: (
          values: Partial<AgentProfileFormValues>,
        ) => void | Promise<void>
      }
  )

export function AgentProfileForm(props: AgentProfileFormProps) {
  const { mode = "create", defaultValues } = props
  const fieldIdPrefix = useId()
  const [savedValues, setSavedValues] = useState(() =>
    buildAgentProfileFormValues(defaultValues),
  )
  const [values, setValues] = useState<AgentProfileFormValues>(savedValues)
  const [photoUploadState, setPhotoUploadState] = useState<MediaUploaderState>({
    isUploading: false,
    hasFailedUpload: false,
    media: savedValues.profilePhoto ? [savedValues.profilePhoto] : [],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const normalizedInitialValues = useMemo(
    () => normalizeAgentProfileFormValues(savedValues),
    [savedValues],
  )

  const normalizedValues = useMemo(
    () => normalizeAgentProfileFormValues(values),
    [values],
  )

  const changedValues = useMemo(
    () =>
      buildChangedAgentProfileValues(
        normalizedInitialValues,
        normalizedValues,
      ),
    [normalizedInitialValues, normalizedValues],
  )

  const hasChanges = mode === "create" || Object.keys(changedValues).length > 0
  const hasReachableContact = hasAgentContactMethod(normalizedValues)
  const isValid =
    normalizedValues.displayName.length > 0 &&
    normalizedValues.supportLanguages.length > 0 &&
    hasReachableContact

  const canSave =
    isValid &&
    hasChanges &&
    !photoUploadState.isUploading &&
    !photoUploadState.hasFailedUpload &&
    !isSubmitting

  const updateField = (field: ProfileTextField, value: string) => {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }))
  }

  const updateSupportLanguages = (supportLanguages?: string[]) => {
    if (isSubmitting) return

    setValues((currentValues) => ({
      ...currentValues,
      supportLanguages: supportLanguages ?? [],
    }))
  }

  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault()
        if (!canSave) return

        setSubmitError("")
        setIsSubmitting(true)

        try {
          if (mode === "edit") {
            await (props.mode === "edit"
              ? props.onSubmit?.(changedValues)
              : undefined)
          } else {
            await (props.mode !== "edit"
              ? props.onSubmit?.(normalizedValues)
              : undefined)
          }

          if (mode === "edit") {
            setSavedValues(normalizedValues)
            setValues(normalizedValues)
          }
        } catch (error) {
          setSubmitError(getFormErrorMessage(error, "Could not save profile"))
        } finally {
          setIsSubmitting(false)
        }
      }}
    >
      <AvatarUploader
        displayName={values.displayName}
        label="Profile photo"
        description="Upload one clear photo for your profile."
        disabled={isSubmitting}
        defaultMedia={savedValues.profilePhoto}
        onUploadStateChange={(state) => {
          setPhotoUploadState(state)
          setValues((currentValues) => ({
            ...currentValues,
            profilePhoto: state.media[0] ?? null,
          }))
        }}
      />

      {photoUploadState.hasFailedUpload && (
        <p className="text-sm font-medium text-red-600" role="alert">
          Remove or retry the failed profile photo first.
        </p>
      )}

      <div className="space-y-4">
        <FormField label="Display name" required>
          <Input
            id={`${fieldIdPrefix}-display-name`}
            name="displayName"
            value={values.displayName}
            placeholder="Name shown to renters"
            autoComplete="name"
            disabled={isSubmitting}
            className="placeholder:text-slate-300"
            onChange={(event) => updateField("displayName", event.target.value)}
          />
        </FormField>

        <MultiOptionSelector
          label="Support languages"
          description={
            values.supportLanguages.length === 0
              ? "Choose at least one language renters can contact you in."
              : undefined
          }
          options={SUPPORT_LANGUAGE_OPTIONS}
          value={values.supportLanguages}
          required
          disabled={isSubmitting}
          onChange={updateSupportLanguages}
        />

        <FormField label="About">
          <Textarea
            id={`${fieldIdPrefix}-description`}
            name="description"
            value={values.description}
            placeholder="Tell renters about your service area, rooms, and support."
            autoComplete="off"
            disabled={isSubmitting}
            className="min-h-28 resize-none placeholder:text-slate-300"
            onChange={(event) => updateField("description", event.target.value)}
          />
        </FormField>

        <fieldset
          aria-required="true"
          aria-describedby={`${fieldIdPrefix}-contact-description`}
          className="m-0 min-w-0 space-y-3 border-0 p-0"
        >
          <legend className="p-0 text-sm font-medium text-slate-950">
            Contact method
            <span className="text-red-600" aria-hidden="true">
              {" "}
              *
            </span>
          </legend>
          <p
            id={`${fieldIdPrefix}-contact-description`}
            className="text-xs leading-5 text-slate-500"
          >
            Add at least one phone or messaging contact renters can use.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {AGENT_CONTACT_FORM_FIELDS.map((contact) => (
              <FormField
                key={contact.key}
                label={contact.label}
                className={contact.className}
              >
                <Input
                  id={`${fieldIdPrefix}-${contact.key}`}
                  name={contact.key}
                  value={values[contact.key]}
                  placeholder={contact.placeholder}
                  inputMode={contact.inputMode}
                  autoComplete={contact.autoComplete}
                  disabled={isSubmitting}
                  className="placeholder:text-slate-300"
                  onChange={(event) =>
                    updateField(contact.key, event.target.value)
                  }
                />
              </FormField>
            ))}
          </div>
        </fieldset>
      </div>

      {submitError && (
        <p className="text-sm font-medium text-red-600" role="alert">
          {submitError}
        </p>
      )}

      <Button
        type="submit"
        className="h-11 w-full rounded-full"
        disabled={!canSave}
      >
        {photoUploadState.isUploading
          ? "Uploading..."
          : isSubmitting
            ? "Saving..."
            : mode === "edit" && isValid && !hasChanges
              ? "No changes"
              : mode === "edit"
                ? "Save changes"
                : "Create profile"}
      </Button>
    </form>
  )
}
