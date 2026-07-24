import type { UploadedMedia } from "@/features/uploads/api/uploadToCloudinary"
import {
  areStringArraysEqual,
  normalizeFormText,
  sortFormStrings,
} from "@/features/listing/utils/formFieldUtils"

import { hasAgentContactMethod } from "./contactFieldDefinitions"

export type AgentProfileFormValues = {
  displayName: string
  profilePhoto: UploadedMedia | null
  description: string
  phone: string
  lineUrl: string
  whatsappPhone: string
  telegramUrl: string
  viberPhone: string
  supportLanguages: string[]
}

export const initialAgentProfileFormValues: AgentProfileFormValues = {
  displayName: "",
  profilePhoto: null,
  description: "",
  phone: "",
  lineUrl: "",
  whatsappPhone: "",
  telegramUrl: "",
  viberPhone: "",
  supportLanguages: [],
}

export function buildAgentProfileFormValues(
  values?: Partial<AgentProfileFormValues>,
): AgentProfileFormValues {
  return {
    ...initialAgentProfileFormValues,
    ...values,
    displayName: values?.displayName ?? "",
    description: values?.description ?? "",
    phone: values?.phone ?? "",
    lineUrl: values?.lineUrl ?? "",
    whatsappPhone: values?.whatsappPhone ?? "",
    telegramUrl: values?.telegramUrl ?? "",
    viberPhone: values?.viberPhone ?? "",
    supportLanguages: Array.isArray(values?.supportLanguages)
      ? values.supportLanguages
      : [],
    profilePhoto: values?.profilePhoto ?? null,
  }
}

export function normalizeAgentProfileFormValues(
  values: AgentProfileFormValues,
): AgentProfileFormValues {
  return {
    displayName: normalizeFormText(values.displayName),
    profilePhoto: values.profilePhoto,
    description: normalizeFormText(values.description),
    phone: normalizeFormText(values.phone),
    lineUrl: normalizeFormText(values.lineUrl),
    whatsappPhone: normalizeFormText(values.whatsappPhone),
    telegramUrl: normalizeFormText(values.telegramUrl),
    viberPhone: normalizeFormText(values.viberPhone),
    supportLanguages: sortFormStrings(values.supportLanguages),
  }
}

function areMediaEqual(
  firstMedia: UploadedMedia | null,
  secondMedia: UploadedMedia | null,
) {
  if (!firstMedia && !secondMedia) return true
  if (!firstMedia || !secondMedia) return false

  return (
    firstMedia.publicId === secondMedia.publicId &&
    firstMedia.secureUrl === secondMedia.secureUrl
  )
}

export function buildChangedAgentProfileValues(
  initialValues: AgentProfileFormValues,
  currentValues: AgentProfileFormValues,
): Partial<AgentProfileFormValues> {
  const changes: Partial<AgentProfileFormValues> = {}

  if (initialValues.displayName !== currentValues.displayName) {
    changes.displayName = currentValues.displayName
  }

  if (!areMediaEqual(initialValues.profilePhoto, currentValues.profilePhoto)) {
    changes.profilePhoto = currentValues.profilePhoto
  }

  if (initialValues.description !== currentValues.description) {
    changes.description = currentValues.description
  }

  if (initialValues.phone !== currentValues.phone) {
    changes.phone = currentValues.phone
  }

  if (initialValues.lineUrl !== currentValues.lineUrl) {
    changes.lineUrl = currentValues.lineUrl
  }

  if (initialValues.whatsappPhone !== currentValues.whatsappPhone) {
    changes.whatsappPhone = currentValues.whatsappPhone
  }

  if (initialValues.telegramUrl !== currentValues.telegramUrl) {
    changes.telegramUrl = currentValues.telegramUrl
  }

  if (initialValues.viberPhone !== currentValues.viberPhone) {
    changes.viberPhone = currentValues.viberPhone
  }

  if (
    !areStringArraysEqual(
      initialValues.supportLanguages,
      currentValues.supportLanguages,
    )
  ) {
    changes.supportLanguages = currentValues.supportLanguages
  }

  return changes
}

export { hasAgentContactMethod }
