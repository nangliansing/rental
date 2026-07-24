import type { ContactLink } from "../types"

export function getContactIconClassName(type: ContactLink["type"]) {
  if (type === "line") return "text-[#06c755]"
  if (type === "whatsapp") return "text-[#25d366]"
  if (type === "telegram") return "text-[#26a5e4]"
  if (type === "viber") return "text-[#7360f2]"

  return "text-slate-700"
}
