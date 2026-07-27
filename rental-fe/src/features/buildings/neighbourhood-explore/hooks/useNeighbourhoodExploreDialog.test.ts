import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { useNeighbourhoodExploreDialog } from "./useNeighbourhoodExploreDialog"

describe("useNeighbourhoodExploreDialog", () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it("starts closed", () => {
    const { result } = renderHook(() => useNeighbourhoodExploreDialog())

    expect(result.current.isOpen).toBe(false)
  })

  it("opens the dialog and stores the trigger element", () => {
    const { result } = renderHook(() => useNeighbourhoodExploreDialog())
    const trigger = document.createElement("button")
    document.body.appendChild(trigger)

    act(() => {
      result.current.open(trigger)
    })

    expect(result.current.isOpen).toBe(true)
  })

  it("closes the dialog", () => {
    const { result } = renderHook(() => useNeighbourhoodExploreDialog())

    act(() => {
      result.current.open()
      result.current.close()
    })

    expect(result.current.isOpen).toBe(false)
  })

  it("restores focus to the opening trigger after close", async () => {
    const { result } = renderHook(() => useNeighbourhoodExploreDialog())
    const trigger = document.createElement("button")
    document.body.appendChild(trigger)
    const focusSpy = vi.spyOn(trigger, "focus")

    act(() => {
      result.current.open(trigger)
    })

    act(() => {
      result.current.close()
    })

    await waitFor(() => {
      expect(focusSpy).toHaveBeenCalledOnce()
    })
  })

  it("does not restore focus when the dialog was never opened from a trigger", async () => {
    const { result } = renderHook(() => useNeighbourhoodExploreDialog())
    const trigger = document.createElement("button")
    document.body.appendChild(trigger)
    const focusSpy = vi.spyOn(trigger, "focus")

    act(() => {
      result.current.open()
      result.current.close()
    })

    await waitFor(() => {
      expect(result.current.isOpen).toBe(false)
    })

    expect(focusSpy).not.toHaveBeenCalled()
  })
})
