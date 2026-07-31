import { useId, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import type { UpdateMyUserInput } from "@/features/auth/types"
import { getFormErrorMessage } from "@/features/listing/utils/formFieldUtils"
import { AvatarUploader } from "@/features/uploads/components/AvatarUploader"
import type { MediaUploaderState } from "@/features/uploads/components/MediaUploader"

import {
  buildAccountProfileFormValues,
  buildChangedAccountProfileValues,
  isAccountProfileFormValid,
  normalizeAccountProfileFormValues,
  type AccountProfileFormValues,
} from "../utils/accountProfileFormUtils"

type AccountProfileFormProps = {
  defaultValues?: Partial<AccountProfileFormValues>
  onSubmit?: (values: UpdateMyUserInput) => void | Promise<void>
}

export function AccountProfileForm({
  defaultValues,
  onSubmit,
}: AccountProfileFormProps) {
  const fieldIdPrefix = useId()
  const [savedValues, setSavedValues] = useState(() =>
    buildAccountProfileFormValues(defaultValues),
  )
  const [values, setValues] = useState<AccountProfileFormValues>(savedValues)
  const [photoUploadState, setPhotoUploadState] = useState<MediaUploaderState>({
    isUploading: false,
    hasFailedUpload: false,
    media: savedValues.profilePhoto ? [savedValues.profilePhoto] : [],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const normalizedInitialValues = useMemo(
    () => normalizeAccountProfileFormValues(savedValues),
    [savedValues],
  )

  const normalizedValues = useMemo(
    () => normalizeAccountProfileFormValues(values),
    [values],
  )

  const changedValues = useMemo(
    () =>
      buildChangedAccountProfileValues(
        normalizedInitialValues,
        normalizedValues,
      ),
    [normalizedInitialValues, normalizedValues],
  )

  const hasChanges = Object.keys(changedValues).length > 0
  const isValid = isAccountProfileFormValid(normalizedValues)
  const canSave =
    isValid &&
    hasChanges &&
    !photoUploadState.isUploading &&
    !photoUploadState.hasFailedUpload &&
    !isSubmitting

  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault()
        if (!canSave) return

        setSubmitError("")
        setIsSubmitting(true)

        try {
          await onSubmit?.(changedValues)
          setSavedValues(normalizedValues)
          setValues(normalizedValues)
        } catch (error) {
          setSubmitError(getFormErrorMessage(error, "Could not save account"))
        } finally {
          setIsSubmitting(false)
        }
      }}
    >
      <AvatarUploader
        purpose="user-profile-photo"
        displayName={values.name}
        label="Profile photo"
        description="Upload one clear photo for your account."
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

      <FormField label="Name" required>
        <Input
          id={`${fieldIdPrefix}-name`}
          name="name"
          value={values.name}
          placeholder="Your name"
          autoComplete="name"
          disabled={isSubmitting}
          className="placeholder:text-slate-300"
          onChange={(event) =>
            setValues((currentValues) => ({
              ...currentValues,
              name: event.target.value,
            }))
          }
        />
      </FormField>

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
            : isValid && !hasChanges
              ? "No changes"
              : "Save changes"}
      </Button>
    </form>
  )
}
