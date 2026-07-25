import { describe, expect, it, vi } from "vitest"

import { openExternalHref } from "./openExternalHref"

describe("openExternalHref", () => {
  it("opens standard links in a new tab", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null)

    openExternalHref("https://line.me/ti/p/abc")

    expect(openSpy).toHaveBeenCalledWith(
      "https://line.me/ti/p/abc",
      "_blank",
      "noopener,noreferrer",
    )
  })

  it("ignores empty and unsupported href values", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null)

    openExternalHref("   ")
    openExternalHref("javascript:alert(1)")

    expect(openSpy).not.toHaveBeenCalled()
  })

  it("routes tel links through location.href", () => {
    const location = { href: "http://localhost:3000/" }
    const locationSpy = vi
      .spyOn(window, "location", "get")
      .mockReturnValue(location as Location)

    openExternalHref("tel:0812345678")

    expect(location.href).toBe("tel:0812345678")
    locationSpy.mockRestore()
  })
})
