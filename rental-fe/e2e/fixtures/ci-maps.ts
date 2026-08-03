import type { TestType } from "@playwright/test"

const PLACEHOLDER_MAPS_KEY = "test-google-maps-api-key"

export function usesPlaceholderMapsKey() {
  const key = process.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
  return !key || key === PLACEHOLDER_MAPS_KEY
}

/** Skip tests that need a live Google Maps canvas; unreliable with the CI placeholder key. */
export function skipIfCiPlaceholderMapsKey(test: TestType<any, any>) {
  test.skip(
    Boolean(process.env.CI) && usesPlaceholderMapsKey(),
    "Interactive Google Maps canvas is unreliable with the CI placeholder API key.",
  )
}
