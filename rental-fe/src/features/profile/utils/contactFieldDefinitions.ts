import type { AgentProfile } from "../api"
import type { AgentProfileFormValues } from "./agentProfileFormUtils"

export type AgentContactFieldKey = keyof Pick<
  AgentProfile,
  "phone" | "lineUrl" | "whatsappPhone" | "telegramUrl" | "viberPhone"
>

type AgentContactFormFieldConfig = {
  key: AgentContactFieldKey
  label: string
  placeholder: string
  inputMode: "tel" | "url"
  autoComplete: "tel" | "url"
  className?: string
}

type AgentContactDisplayFieldConfig = {
  key: AgentContactFieldKey
  id: string
  label: string
}

export const AGENT_CONTACT_FORM_FIELDS: readonly AgentContactFormFieldConfig[] =
  [
    {
      key: "phone",
      label: "Phone",
      placeholder: "Phone number",
      inputMode: "tel",
      autoComplete: "tel",
      className: "sm:col-span-2",
    },
    {
      key: "whatsappPhone",
      label: "WhatsApp",
      placeholder: "WhatsApp number",
      inputMode: "tel",
      autoComplete: "tel",
    },
    {
      key: "viberPhone",
      label: "Viber",
      placeholder: "Viber number",
      inputMode: "tel",
      autoComplete: "tel",
    },
    {
      key: "lineUrl",
      label: "LINE URL",
      placeholder: "LINE profile URL",
      inputMode: "url",
      autoComplete: "url",
    },
    {
      key: "telegramUrl",
      label: "Telegram URL",
      placeholder: "Telegram profile URL",
      inputMode: "url",
      autoComplete: "url",
    },
  ]

export const AGENT_CONTACT_DISPLAY_FIELDS: readonly AgentContactDisplayFieldConfig[] =
  [
    { id: "line", key: "lineUrl", label: "Line" },
    { id: "whatsapp", key: "whatsappPhone", label: "WhatsApp" },
    { id: "telegram", key: "telegramUrl", label: "Telegram" },
    { id: "viber", key: "viberPhone", label: "Viber" },
    { id: "phone", key: "phone", label: "Phone" },
  ]

export function hasAgentContactMethod(values: AgentProfileFormValues) {
  return AGENT_CONTACT_FORM_FIELDS.some(
    (field) => (values[field.key] ?? "").trim().length > 0,
  )
}
