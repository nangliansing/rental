export function getFormErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function normalizeFormText(value: string | null | undefined) {
  return (value ?? "").trim()
}

export function sortFormStrings(values: string[] | null | undefined) {
  return [...(Array.isArray(values) ? values : [])].sort((firstValue, secondValue) =>
    firstValue.localeCompare(secondValue),
  )
}

export function areStringArraysEqual(firstValues: string[], secondValues: string[]) {
  if (firstValues.length !== secondValues.length) return false

  return firstValues.every((value, index) => value === secondValues[index])
}

export function stringifyFormNumber(value: number | null | undefined) {
  return value == null ? "" : String(value)
}

export function parseRequiredFormNumber(value: string) {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : Number.NaN
}

export function parseOptionalFormNumber(value: string) {
  const trimmedValue = value.trim()

  if (trimmedValue.length === 0) return null

  const numberValue = Number(trimmedValue)

  return Number.isFinite(numberValue) ? numberValue : Number.NaN
}
