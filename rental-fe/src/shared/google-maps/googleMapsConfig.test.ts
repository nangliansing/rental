import { describe, expect, it } from "vitest"

import {
  GOOGLE_MAPS_MAP_ID,
  shouldUseClientMapStyles,
} from "./googleMapsConfig"

describe("googleMapsConfig", () => {
  it("allows client styles only for demo map ids", () => {
    expect(shouldUseClientMapStyles("DEMO_MAP_ID")).toBe(true)
    expect(shouldUseClientMapStyles("")).toBe(true)
    expect(shouldUseClientMapStyles("production-map-id")).toBe(false)
    expect(shouldUseClientMapStyles(GOOGLE_MAPS_MAP_ID)).toBeTypeOf("boolean")
  })
})
