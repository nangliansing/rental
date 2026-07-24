export const DEFAULT_NEARBY_RADIUS_METERS = 1_000

export const NEARBY_RADIUS_OPTIONS = [500, 750, 1_000, 1_250, 1_500, 2_000] as const

export function isSupportedSearchRadius(radiusMeters: number) {
  return NEARBY_RADIUS_OPTIONS.some((radius) => radius === radiusMeters)
}

export function formatSearchRadius(radiusMeters: number) {
  if (radiusMeters < 1_000) return `${radiusMeters} m`

  return `${Number((radiusMeters / 1_000).toFixed(2))} km`
}
