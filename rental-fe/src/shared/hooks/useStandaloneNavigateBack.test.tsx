import { renderHook } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useStandaloneNavigateBack } from "./useStandaloneNavigateBack"

const navigateMock = vi.fn()

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  )

  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

describe("useStandaloneNavigateBack", () => {
  beforeEach(() => {
    navigateMock.mockReset()
  })

  it("navigates back in history when available", () => {
    const { result } = renderHook(() => useStandaloneNavigateBack("/"), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={["/", "/listings/listing-1"]} initialIndex={1}>
          {children}
        </MemoryRouter>
      ),
    })

    result.current()

    expect(navigateMock).toHaveBeenCalledWith(-1)
  })

  it("falls back to home when there is no history entry", () => {
    const { result } = renderHook(() => useStandaloneNavigateBack("/"), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={[{ pathname: "/listings/listing-1" }]}>
          {children}
        </MemoryRouter>
      ),
    })

    result.current()

    expect(navigateMock).toHaveBeenCalledWith("/")
  })

  it("supports a custom fallback path", () => {
    const { result } = renderHook(() => useStandaloneNavigateBack("/profile"), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={[{ pathname: "/listings/listing-1" }]}>
          {children}
        </MemoryRouter>
      ),
    })

    result.current()

    expect(navigateMock).toHaveBeenCalledWith("/profile")
  })
})
