import { describe, expect, it } from "vitest"

import { getKeyboardMovedPin } from "./move-map-pin"

describe("getKeyboardMovedPin", () => {
  const position = { lat: 13.7, lng: 100.6 }

  it("moves the pin in each arrow-key direction", () => {
    expect(getKeyboardMovedPin(position, "ArrowUp")?.lat).toBeCloseTo(13.7005)
    expect(getKeyboardMovedPin(position, "ArrowDown")?.lat).toBeCloseTo(13.6995)
    expect(getKeyboardMovedPin(position, "ArrowLeft")?.lng).toBeCloseTo(100.5995)
    expect(getKeyboardMovedPin(position, "ArrowRight")?.lng).toBeCloseTo(100.6005)
  })

  it("uses a larger step while Shift is held", () => {
    expect(getKeyboardMovedPin(position, "ArrowUp", true)?.lat).toBeCloseTo(
      13.7025,
    )
  })

  it("ignores unrelated keys", () => {
    expect(getKeyboardMovedPin(position, "Enter")).toBeNull()
  })
})
