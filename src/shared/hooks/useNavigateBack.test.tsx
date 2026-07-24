import { renderHook } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useNavigateBack } from "./useNavigateBack"

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

describe("useNavigateBack", () => {
  beforeEach(() => {
    navigateMock.mockClear()
  })

  it("navigates back when location has history", () => {
    const { result } = renderHook(() => useNavigateBack("/"), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={["/", "/login"]} initialIndex={1}>
          {children}
        </MemoryRouter>
      ),
    })

    result.current()

    expect(navigateMock).toHaveBeenCalledWith(-1)
  })

  it("uses the fallback path for direct entry", () => {
    const { result } = renderHook(() => useNavigateBack("/profile"), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={[{ pathname: "/login" }]}>
          {children}
        </MemoryRouter>
      ),
    })

    result.current()

    expect(navigateMock).toHaveBeenCalledWith("/profile")
  })
})
