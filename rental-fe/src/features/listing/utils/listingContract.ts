import { CONTRACT_MONTH_OPTIONS, type SelectOption } from "@/shared/options/rental-options"

export const DEFAULT_LISTING_CONTRACT_MONTHS = 3

export type ListingContractOption = SelectOption<number> & {
  description: string
}

export const LISTING_CONTRACT_OPTIONS: readonly ListingContractOption[] =
  CONTRACT_MONTH_OPTIONS.map((option) => ({
    ...option,
    description:
      option.value === 1
        ? "Tenants must stay at least 1 month."
        : `Tenants must stay at least ${option.value} months.`,
  }))

export function normalizeListingContractMonths(
  value: number | string | null | undefined,
): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN

  if (
    Number.isInteger(numeric) &&
    LISTING_CONTRACT_OPTIONS.some((option) => option.value === numeric)
  ) {
    return numeric
  }

  return DEFAULT_LISTING_CONTRACT_MONTHS
}

export function getListingContractOption(
  value: number | string | null | undefined,
): ListingContractOption {
  const normalized = normalizeListingContractMonths(value)
  return LISTING_CONTRACT_OPTIONS.find((option) => option.value === normalized)!
}
