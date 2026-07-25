import type { ContactLink } from "../types"

export const FOOTER_ICON_BUTTON_CLASSNAME =
  "inline-flex size-10 shrink-0 touch-manipulation items-center justify-center rounded-full bg-transparent text-slate-600 transition-[color,background-color] duration-150 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"

export const FOOTER_ICON_CLASSNAME = "size-[21px]"

export const FOOTER_ICON_PROPS = {
  className: FOOTER_ICON_CLASSNAME,
  strokeWidth: 1.75,
  absoluteStrokeWidth: true,
} as const

export function getContactIconClassName(type: ContactLink["type"]) {
  if (type === "line") return "text-[#06c755]"
  if (type === "whatsapp") return "text-[#25d366]"
  if (type === "telegram") return "text-[#26a5e4]"
  if (type === "viber") return "text-[#7360f2]"

  return "text-slate-700"
}
