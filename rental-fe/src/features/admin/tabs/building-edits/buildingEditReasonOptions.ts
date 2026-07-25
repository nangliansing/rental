export const buildingEditRejectReasonOptions = [
  "Building name looks incorrect",
  "Address or pin location needs review",
  "Building type is incorrect",
  "Facilities do not match the building",
  "Security details need review",
  "Proposed changes are incomplete",
] as const

export const buildingEditStatusFilters = [
  { label: "All" },
  { label: "Pending", value: "PENDING" as const },
  { label: "Approved", value: "APPROVED" as const },
  { label: "Rejected", value: "REJECTED" as const },
]
