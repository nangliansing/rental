import { renderHook, act } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import * as openExternalHrefModule from "../utils/openExternalHref"
import { useDirectionsAction } from "./useDirectionsAction"

describe("useDirectionsAction", () => {
  it("resolves valid directions and opens maps on confirm", async () => {
    const openSpy = vi
      .spyOn(openExternalHrefModule, "openExternalHref")
      .mockImplementation(() => undefined)

    const { result } = renderHook(() =>
      useDirectionsAction({
        destination: {
          name: "Bangkapi Residence",
          coordinates: [100.6435, 13.7654],
        },
      }),
    )

    expect(result.current.hasDirections).toBe(true)
    expect(result.current.destinationLabel).toBe("Bangkapi Residence")

    act(() => {
      result.current.openConfirmDialog()
    })

    expect(result.current.isConfirmOpen).toBe(true)

    act(() => {
      result.current.confirmDirections()
    })

    expect(openSpy).toHaveBeenCalledWith(
      "https://www.google.com/maps/dir/?api=1&destination=13.7654%2C100.6435",
    )
    expect(result.current.isConfirmOpen).toBe(false)
    openSpy.mockRestore()
  })

  it("ignores invalid destinations", () => {
    const { result } = renderHook(() =>
      useDirectionsAction({
        destination: {
          name: "Tower",
          coordinates: [999, 999],
        },
      }),
    )

    expect(result.current.hasDirections).toBe(false)
    expect(result.current.directionsUrl).toBeNull()

    act(() => {
      result.current.openConfirmDialog()
    })

    expect(result.current.isConfirmOpen).toBe(false)
  })
})
