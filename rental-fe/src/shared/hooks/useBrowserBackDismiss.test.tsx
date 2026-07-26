import { renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { __resetModalHistoryStackForTests } from "@/shared/utils/modalHistoryStack"

import { useBrowserBackDismiss } from "./useBrowserBackDismiss"

describe("useBrowserBackDismiss", () => {
  beforeEach(() => {
    __resetModalHistoryStackForTests()
  })

  afterEach(() => {
    __resetModalHistoryStackForTests()
  })

  it("dismisses through the history stack without leaving a stale entry", () => {
    const onDismiss = vi.fn()
    const back = vi.spyOn(window.history, "back")

    const { result, rerender } = renderHook(
      ({ isOpen }) => useBrowserBackDismiss(isOpen, onDismiss),
      { initialProps: { isOpen: true } },
    )

    result.current()

    expect(onDismiss).toHaveBeenCalledOnce()
    expect(back).toHaveBeenCalledOnce()

    rerender({ isOpen: false })

    window.dispatchEvent(new PopStateEvent("popstate"))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
