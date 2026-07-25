import { renderHook, act } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useContactActions } from "./useContactActions"

describe("useContactActions", () => {
  it("builds contact links and manages dialog state", async () => {
    const { result } = renderHook(() =>
      useContactActions({
        contactOwnerName: "  Nang  ",
        contacts: { phone: "0812345678" },
      }),
    )

    expect(result.current.contactOwnerName).toBe("Nang")
    expect(result.current.hasContactOptions).toBe(true)
    expect(result.current.isContactDialogOpen).toBe(false)

    act(() => {
      result.current.openContactDialog()
    })

    expect(result.current.isContactDialogOpen).toBe(true)

    await act(async () => {
      await result.current.handleSelectContact(result.current.contactLinks[0]!)
    })

    expect(result.current.isContactDialogOpen).toBe(false)
  })

  it("returns no options for invalid contact payloads", () => {
    const { result } = renderHook(() =>
      useContactActions({
        contactOwnerName: "",
        contacts: {
          phone: "++--",
          lineUrl: "not-a-url",
        },
      }),
    )

    expect(result.current.contactOwnerName).toBe("Lister")
    expect(result.current.hasContactOptions).toBe(false)
    expect(result.current.contactLinks).toEqual([])
  })
})
