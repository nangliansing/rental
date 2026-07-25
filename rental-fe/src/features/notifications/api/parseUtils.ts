export const readRecord = (value: unknown): Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export const readString = (value: unknown, fallback = "") => {
  return typeof value === "string" ? value : fallback
}

export const readNullableString = (value: unknown) => {
  return typeof value === "string" ? value : null
}

export const readBoolean = (value: unknown, fallback = false) => {
  return typeof value === "boolean" ? value : fallback
}

export const readNumber = (value: unknown, fallback = 0) => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

export const normalizePositiveInteger = (value: unknown, fallback: number) => {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : fallback

  return Number.isInteger(numberValue) && numberValue > 0
    ? numberValue
    : fallback
}
