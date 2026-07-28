import { describe, expect, it } from "vitest"

import { shouldUseClientMapStyles } from "./googleMapsConfig"

describe("googleMapsConfig", () => {
  it("allows client styles only when no map id is configured", () => {
    expect(shouldUseClientMapStyles("DEMO_MAP_ID")).toBe(false)
    expect(shouldUseClientMapStyles("production-map-id")).toBe(false)
    expect(shouldUseClientMapStyles("")).toBe(true)
  })
})
