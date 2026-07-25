import { describe, expect, it } from "vitest"

import {
  createInitialMapInteractionState,
  initialMapInteractionState,
  mapInteractionReducer,
} from "./MapInteractionContext"

describe("createInitialMapInteractionState", () => {
  it("enters pin mode when a nearby search position is provided", () => {
    const position = { lat: 13.7563, lng: 100.5018 }

    expect(createInitialMapInteractionState({ initialPosition: position })).toEqual({
      mode: "pin",
      selectedPin: position,
      currentLocation: null,
      pinSource: "manual",
    })
  })

  it("enters line mode when a line search URL is hydrated", () => {
    expect(createInitialMapInteractionState({ initialLineMode: true })).toEqual({
      mode: "line",
      selectedPin: null,
      currentLocation: null,
      pinSource: null,
    })
  })

  it("prefers pin mode when both nearby position and line mode are present", () => {
    const position = { lat: 13.7563, lng: 100.5018 }

    expect(
      createInitialMapInteractionState({
        initialPosition: position,
        initialLineMode: true,
      }).mode,
    ).toBe("pin")
  })
})

describe("mapInteractionReducer", () => {
  it("enters and exits manual pin mode atomically", () => {
    const position = { lat: 13.7, lng: 100.6 }
    const pinned = mapInteractionReducer(initialMapInteractionState, {
      type: "enterManualPin",
      position,
    })

    expect(pinned).toEqual({
      mode: "pin",
      selectedPin: position,
      currentLocation: null,
      pinSource: "manual",
    })
    expect(mapInteractionReducer(pinned, { type: "exitPinMode" })).toEqual(
      initialMapInteractionState,
    )
  })

  it("uses the blue location as the pin until the pin is moved", () => {
    const currentPosition = { lat: 13.7, lng: 100.6 }
    const located = mapInteractionReducer(initialMapInteractionState, {
      type: "enterCurrentLocation",
      position: currentPosition,
    })
    const movedPosition = { lat: 13.8, lng: 100.7 }
    const moved = mapInteractionReducer(located, {
      type: "movePin",
      position: movedPosition,
    })

    expect(located.currentLocation).toEqual(currentPosition)
    expect(located.pinSource).toBe("current-location")
    expect(moved).toEqual({
      mode: "pin",
      selectedPin: movedPosition,
      currentLocation: null,
      pinSource: "manual",
    })
  })

  it("ignores pin movement while area mode is active", () => {
    expect(
      mapInteractionReducer(initialMapInteractionState, {
        type: "movePin",
        position: { lat: 13.8, lng: 100.7 },
      }),
    ).toBe(initialMapInteractionState)
  })

  it("enters line mode without retaining a conflicting pin", () => {
    const pinned = mapInteractionReducer(initialMapInteractionState, {
      type: "enterManualPin",
      position: { lat: 13.7, lng: 100.6 },
    })

    expect(mapInteractionReducer(pinned, { type: "enterLineMode" })).toEqual({
      mode: "line",
      selectedPin: null,
      currentLocation: null,
      pinSource: null,
    })
  })

  it("returns from line mode to the default area mode", () => {
    const drawing = mapInteractionReducer(initialMapInteractionState, {
      type: "enterLineMode",
    })

    expect(mapInteractionReducer(drawing, { type: "exitLineMode" })).toEqual(
      initialMapInteractionState,
    )
  })

  it("ignores invalid coordinates defensively", () => {
    expect(
      mapInteractionReducer(initialMapInteractionState, {
        type: "enterManualPin",
        position: { lat: Number.NaN, lng: 100.7 },
      }),
    ).toBe(initialMapInteractionState)
    expect(
      mapInteractionReducer(initialMapInteractionState, {
        type: "enterCurrentLocation",
        position: { lat: 91, lng: 100.7 },
      }),
    ).toBe(initialMapInteractionState)
  })
})
