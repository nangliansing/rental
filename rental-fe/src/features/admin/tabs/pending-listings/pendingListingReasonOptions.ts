export const pendingRejectReasonOptions = [
  "Listing photos are unclear",
  "Building details are incomplete",
  "Room details or pricing look incorrect",
  "Duplicate building submission",
  "Contact information needs review",
  "Submission does not meet platform guidelines",
] as const

export const pendingApproveReasonOptions = [
  "Verified building location, listing details, and photos",
  "Listing details match platform requirements",
  "Existing building and room details verified",
  "Submission is complete and ready to publish",
] as const

export const pendingStatusFilters = [
  { label: "All" },
  { label: "Pending", value: "PENDING" as const },
  { label: "Approved", value: "APPROVED" as const },
  { label: "Rejected", value: "REJECTED" as const },
]
