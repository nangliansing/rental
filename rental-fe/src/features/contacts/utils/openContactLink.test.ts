import { describe, expect, it, vi } from "vitest"

import type { ContactLink } from "../types"
import { openContactLink } from "./openContactLink"

const phoneContact: ContactLink = {
  type: "phone",
  label: "Phone",
  href: "tel:0812345678",
  value: "0812345678",
  action: "open",
  icon: () => null,
}

describe("openContactLink", () => {
  it("routes tel links through openExternalHref", async () => {
    const hrefSpy = vi
      .spyOn(await import("./openExternalHref"), "openExternalHref")
      .mockImplementation(() => undefined)

    await openContactLink(phoneContact, vi.fn())

    expect(hrefSpy).toHaveBeenCalledWith("tel:0812345678")
    hrefSpy.mockRestore()
  })

  it("copies context text before opening external links", async () => {
    const copy = vi.fn()
    const hrefSpy = vi
      .spyOn(await import("./openExternalHref"), "openExternalHref")
      .mockImplementation(() => undefined)

    await openContactLink(
      {
        type: "line",
        label: "Line",
        href: "https://line.me/ti/p/abc",
        copyText: "Hi there",
        action: "open-and-copy",
        icon: () => null,
      },
      copy,
    )

    expect(copy).toHaveBeenCalledWith("line", "Hi there")
    expect(hrefSpy).toHaveBeenCalledWith("https://line.me/ti/p/abc")
    hrefSpy.mockRestore()
  })

  it("ignores blank href and copy values", async () => {
    const copy = vi.fn()
    const hrefSpy = vi
      .spyOn(await import("./openExternalHref"), "openExternalHref")
      .mockImplementation(() => undefined)

    await openContactLink(
      {
        type: "line",
        label: "Line",
        href: "   ",
        copyText: "   ",
        action: "open-and-copy",
        icon: () => null,
      },
      copy,
    )

    expect(copy).not.toHaveBeenCalled()
    expect(hrefSpy).not.toHaveBeenCalled()
    hrefSpy.mockRestore()
  })
})
