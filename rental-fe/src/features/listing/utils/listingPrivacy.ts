import { Globe2, Lock, type LucideIcon } from "lucide-react"

import type { ListingVisibility } from "../types"

export type ListingPrivacyOption = {
  description: string
  icon: LucideIcon
  label: string
  value: ListingVisibility
}

export const LISTING_PRIVACY_OPTIONS: readonly ListingPrivacyOption[] = [
  {
    value: "PUBLIC",
    label: "Public",
    description: "Anyone can find and view this listing.",
    icon: Globe2,
  },
  {
    value: "PRIVATE",
    label: "Private",
    description: "Only you can view it. It will not appear in search.",
    icon: Lock,
  },
]

export function normalizeListingVisibility(
  visibility: ListingVisibility | null | undefined,
): ListingVisibility {
  return visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC"
}

export function getListingPrivacyOption(
  visibility: ListingVisibility | null | undefined,
): ListingPrivacyOption {
  const normalized = normalizeListingVisibility(visibility)
  return (
    LISTING_PRIVACY_OPTIONS.find((option) => option.value === normalized) ??
    LISTING_PRIVACY_OPTIONS[0]!
  )
}
