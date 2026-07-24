export type MonthlyCostNumericInput = number | string | null | undefined

export type MonthlyCostEstimateInput = {
  rent: MonthlyCostNumericInput
  electricRate?: MonthlyCostNumericInput
  waterRate?: MonthlyCostNumericInput
  minElectricUsage?: MonthlyCostNumericInput
  maxElectricUsage?: MonthlyCostNumericInput
  minWaterUsage?: MonthlyCostNumericInput
  maxWaterUsage?: MonthlyCostNumericInput
}

export type MonthlyCostEstimate = {
  minCost: number
  maxCost: number
}

export const DEFAULT_MONTHLY_COST_INPUTS = Object.freeze({
  electricRate: 5,
  waterRate: 20,
  minElectricUsage: 100,
  maxElectricUsage: 300,
  minWaterUsage: 4,
  maxWaterUsage: 10,
})

const MAX_NUMERIC_INPUT_LENGTH = 64
const MAX_SAFE_CURRENCY_AMOUNT = Number.MAX_SAFE_INTEGER / 100
const NON_NEGATIVE_DECIMAL_PATTERN = /^(?:\d+(?:\.\d*)?|\.\d+)$/

export function calculateEstimatedMonthlyCost(
  input: MonthlyCostEstimateInput,
): MonthlyCostEstimate | null
export function calculateEstimatedMonthlyCost(
  input: unknown,
): MonthlyCostEstimate | null
export function calculateEstimatedMonthlyCost(
  input: unknown,
): MonthlyCostEstimate | null {
  try {
    if (!isRecord(input)) return null

    return calculateValidatedMonthlyCost(input)
  } catch {
    return null
  }
}

function calculateValidatedMonthlyCost(
  input: Record<string, unknown>,
): MonthlyCostEstimate | null {
  const normalizedRent = parseNonNegativeNumber(input.rent)
  if (normalizedRent === null) return null

  const normalizedElectricRate = parseOptionalNonNegativeNumber(
    input.electricRate,
    DEFAULT_MONTHLY_COST_INPUTS.electricRate,
  )
  const normalizedWaterRate = parseOptionalNonNegativeNumber(
    input.waterRate,
    DEFAULT_MONTHLY_COST_INPUTS.waterRate,
  )
  const normalizedMinElectricUsage = parseOptionalNonNegativeNumber(
    input.minElectricUsage,
    DEFAULT_MONTHLY_COST_INPUTS.minElectricUsage,
  )
  const normalizedMaxElectricUsage = parseOptionalNonNegativeNumber(
    input.maxElectricUsage,
    DEFAULT_MONTHLY_COST_INPUTS.maxElectricUsage,
  )
  const normalizedMinWaterUsage = parseOptionalNonNegativeNumber(
    input.minWaterUsage,
    DEFAULT_MONTHLY_COST_INPUTS.minWaterUsage,
  )
  const normalizedMaxWaterUsage = parseOptionalNonNegativeNumber(
    input.maxWaterUsage,
    DEFAULT_MONTHLY_COST_INPUTS.maxWaterUsage,
  )

  if (
    normalizedElectricRate === null ||
    normalizedWaterRate === null ||
    normalizedMinElectricUsage === null ||
    normalizedMaxElectricUsage === null ||
    normalizedMinWaterUsage === null ||
    normalizedMaxWaterUsage === null
  ) {
    return null
  }

  const [electricUsageFloor, electricUsageCeiling] = sortBounds(
    normalizedMinElectricUsage,
    normalizedMaxElectricUsage,
  )
  const [waterUsageFloor, waterUsageCeiling] = sortBounds(
    normalizedMinWaterUsage,
    normalizedMaxWaterUsage,
  )

  const minCost = calculateCost(
    normalizedRent,
    normalizedElectricRate,
    electricUsageFloor,
    normalizedWaterRate,
    waterUsageFloor,
  )
  const maxCost = calculateCost(
    normalizedRent,
    normalizedElectricRate,
    electricUsageCeiling,
    normalizedWaterRate,
    waterUsageCeiling,
  )

  if (minCost === null || maxCost === null) return null

  return { minCost, maxCost }
}

function parseOptionalNonNegativeNumber(
  value: unknown,
  fallback: number,
) {
  return isMissing(value) ? fallback : parseNonNegativeNumber(value)
}

function parseNonNegativeNumber(value: unknown) {
  if (typeof value === "number") {
    return isValidCostNumber(value) ? value : null
  }

  if (
    typeof value !== "string" ||
    value.length > MAX_NUMERIC_INPUT_LENGTH
  ) {
    return null
  }

  const normalizedValue = value.trim()
  if (
    !normalizedValue ||
    !NON_NEGATIVE_DECIMAL_PATTERN.test(normalizedValue)
  ) {
    return null
  }

  const parsedValue = Number(normalizedValue)
  return isValidCostNumber(parsedValue) ? parsedValue : null
}

function isMissing(value: unknown) {
  return (
    value == null ||
    (typeof value === "string" &&
      value.length <= MAX_NUMERIC_INPUT_LENGTH &&
      !value.trim())
  )
}

function isValidCostNumber(value: number) {
  return (
    Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function sortBounds(first: number, second: number): [number, number] {
  return first <= second ? [first, second] : [second, first]
}

function calculateCost(
  rent: number,
  electricRate: number,
  electricUsage: number,
  waterRate: number,
  waterUsage: number,
) {
  const cost =
    rent + electricRate * electricUsage + waterRate * waterUsage

  if (!isValidCostNumber(cost) || cost > MAX_SAFE_CURRENCY_AMOUNT) return null

  return Math.round((cost + Number.EPSILON) * 100) / 100
}
