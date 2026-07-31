import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useUserMenuProfileActionsMenu } from "./useUserMenuProfileActionsMenu"

describe("useUserMenuProfileActionsMenu", () => {
  it("opens, toggles, and closes the menu", () => {
    const { result } = renderHook(() => useUserMenuProfileActionsMenu())

    expect(result.current.isOpen).toBe(false)

    act(() => {
      result.current.open()
    })
    expect(result.current.isOpen).toBe(true)

    act(() => {
      result.current.toggle()
    })
    expect(result.current.isOpen).toBe(false)

    act(() => {
      result.current.toggle()
      result.current.close()
    })
    expect(result.current.isOpen).toBe(false)
  })

  it("closes when Escape is pressed while open", () => {
    const { result } = renderHook(() => useUserMenuProfileActionsMenu())

    act(() => {
      result.current.open()
    })

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    })

    expect(result.current.isOpen).toBe(false)
  })

  it("closes when clicking outside the menu", () => {
    const { result } = renderHook(() => useUserMenuProfileActionsMenu())

    act(() => {
      result.current.open()
    })

    act(() => {
      document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))
    })

    expect(result.current.isOpen).toBe(false)
  })
})
