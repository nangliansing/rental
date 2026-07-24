import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useEventCallback } from "./useEventCallback"

describe("useEventCallback", () => {
  it("keeps its identity while calling the latest implementation", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: number }) => useEventCallback(() => value),
      { initialProps: { value: 1 } },
    )
    const initialCallback = result.current

    rerender({ value: 2 })

    expect(result.current).toBe(initialCallback)
    act(() => expect(result.current()).toBe(2))
  })
})
