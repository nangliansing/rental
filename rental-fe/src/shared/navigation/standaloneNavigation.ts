export type StandaloneNavigationState = {
  returnTo?: string
}

function readRecord(value: unknown) {
  return typeof value === "object" && value != null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function normalizeReturnTo(value: unknown): string | null {
  if (typeof value !== "string") return null

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function getReturnToFromLocation(state: unknown): string | null {
  const record = readRecord(state)
  if (!record) return null

  return normalizeReturnTo(record.returnTo)
}

export function buildStandaloneNavigationState(
  returnTo: string | null | undefined,
): StandaloneNavigationState | undefined {
  const normalizedReturnTo = normalizeReturnTo(returnTo ?? null)
  if (!normalizedReturnTo) return undefined

  return { returnTo: normalizedReturnTo }
}

export function getStandaloneNavigationState(
  state: unknown,
): StandaloneNavigationState | undefined {
  const returnTo = getReturnToFromLocation(state)
  return buildStandaloneNavigationState(returnTo)
}
