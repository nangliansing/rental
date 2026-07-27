import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  MapProgrammaticMoveProvider,
  useMapProgrammaticMove,
} from "./MapProgrammaticMoveContext"

describe("MapProgrammaticMoveContext", () => {
  it("tracks programmatic camera moves within the provider", () => {
    const { result } = renderHook(() => useMapProgrammaticMove(), {
      wrapper: MapProgrammaticMoveProvider,
    })

    expect(result.current.isProgrammaticCameraMove()).toBe(false)

    act(() => {
      result.current.beginProgrammaticMove()
    })
    expect(result.current.isProgrammaticCameraMove()).toBe(true)

    act(() => {
      result.current.endProgrammaticMove()
    })
    expect(result.current.isProgrammaticCameraMove()).toBe(false)
  })

  it("falls back to no-op handlers outside the provider", () => {
    const { result } = renderHook(() => useMapProgrammaticMove())

    act(() => {
      result.current.beginProgrammaticMove()
    })
    expect(result.current.isProgrammaticCameraMove()).toBe(false)

    act(() => {
      result.current.endProgrammaticMove()
    })
    expect(result.current.isProgrammaticCameraMove()).toBe(false)
  })
})
