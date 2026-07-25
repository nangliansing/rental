import type { AdminSuspensionStatusFilter } from "../../api"

export const liftSuspensionReasonOptions = [
  "Issue resolved after review",
  "User provided valid clarification",
  "Suspension was applied by mistake",
  "Required corrections were completed",
  "Report was dismissed after investigation",
  "Admin approved account restoration",
]

export const suspensionStatusFilters: {
  label: string
  value?: AdminSuspensionStatusFilter
}[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "ACTIVE" },
  { label: "Expired", value: "EXPIRED" },
  { label: "Lifted", value: "LIFTED" },
]
