import type { UploadedMedia } from "@/features/uploads/api/uploadToCloudinary"
import { normalizeFormText } from "@/features/listing/utils/formFieldUtils"
import { areMediaEqual } from "@/features/uploads/utils/mediaFormUtils"

import type { UpdateMyUserInput } from "@/features/auth/types"

export type AccountProfileFormValues = {
  name: string
  profilePhoto: UploadedMedia | null
}

export const initialAccountProfileFormValues: AccountProfileFormValues = {
  name: "",
  profilePhoto: null,
}

export function buildAccountProfileFormValues(
  values?: Partial<AccountProfileFormValues>,
): AccountProfileFormValues {
  return {
    name: values?.name ?? "",
    profilePhoto: values?.profilePhoto ?? null,
  }
}

export function normalizeAccountProfileFormValues(
  values: AccountProfileFormValues,
): AccountProfileFormValues {
  return {
    name: normalizeFormText(values.name),
    profilePhoto: values.profilePhoto,
  }
}

export function buildChangedAccountProfileValues(
  initialValues: AccountProfileFormValues,
  currentValues: AccountProfileFormValues,
): UpdateMyUserInput {
  const changes: UpdateMyUserInput = {}

  if (initialValues.name !== currentValues.name) {
    changes.name = currentValues.name
  }

  if (!areMediaEqual(initialValues.profilePhoto, currentValues.profilePhoto)) {
    changes.profilePhoto = currentValues.profilePhoto
  }

  return changes
}

export function isAccountProfileFormValid(values: AccountProfileFormValues) {
  return normalizeFormText(values.name).length > 0
}
