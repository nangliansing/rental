import { renderHook, act } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { toast, useToast } from "./use-toast"

describe("useToast", () => {
  it("adds and dismisses a toast", () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      toast({ title: "Hello" })
    })

    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0]?.title).toBe("Hello")

    act(() => {
      result.current.dismiss(result.current.toasts[0]?.id)
    })

    expect(result.current.toasts[0]?.open).toBe(false)
  })
})
