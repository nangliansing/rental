import { act, renderHook } from "@testing-library/react"
import type { KeyboardEvent } from "react"
import { describe, expect, it, vi } from "vitest"

import { useTypeaheadKeyboardNavigation } from "./useTypeaheadKeyboardNavigation"

function keyboardEvent(key: string) {
  return {
    key,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent<HTMLInputElement>
}

describe("useTypeaheadKeyboardNavigation", () => {
  it("navigates, selects, dismisses, and resets between modes", () => {
    const onDismiss = vi.fn()
    const onSelect = vi.fn()
    const onSubmit = vi.fn()
    const { result, rerender } = renderHook(
      ({ resetKey }) =>
        useTypeaheadKeyboardNavigation({
          itemCount: 2,
          resetKey,
          onDismiss,
          onSelect,
          onSubmit,
        }),
      { initialProps: { resetKey: "places" } },
    )

    act(() => result.current.onKeyDown(keyboardEvent("ArrowDown")))
    expect(result.current.activeIndex).toBe(0)
    act(() => result.current.onKeyDown(keyboardEvent("ArrowDown")))
    expect(result.current.activeIndex).toBe(1)
    act(() => result.current.onKeyDown(keyboardEvent("ArrowUp")))
    expect(result.current.activeIndex).toBe(0)

    act(() => result.current.onKeyDown(keyboardEvent("Enter")))
    expect(onSelect).toHaveBeenCalledWith(0)
    expect(onSubmit).not.toHaveBeenCalled()

    rerender({ resetKey: "listers" })
    expect(result.current.activeIndex).toBe(-1)

    act(() => result.current.onKeyDown(keyboardEvent("Escape")))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
