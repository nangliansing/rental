import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi, beforeEach } from "vitest"

import { StandalonePageBackProvider } from "./StandalonePageBackContext"
import { StandalonePageHeader } from "./StandalonePageHeader"

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

function renderHeader(initialEntry = "/login") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <StandalonePageBackProvider>
        <StandalonePageHeader />
      </StandalonePageBackProvider>
    </MemoryRouter>,
  )
}

describe("StandalonePageHeader", () => {
  beforeEach(() => {
    navigateMock.mockClear()
  })

  it("renders back, home, and profile controls", () => {
    renderHeader()

    expect(screen.getByRole("button", { name: "Go back" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Go to home" })).toHaveAttribute(
      "href",
      "/",
    )
    expect(screen.getByRole("link", { name: "Go to profile" })).toHaveAttribute(
      "href",
      "/profile",
    )
  })

  it("navigates back in history when available", async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={["/", "/login"]} initialIndex={1}>
        <StandalonePageBackProvider>
          <StandalonePageHeader />
        </StandalonePageBackProvider>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole("button", { name: "Go back" }))

    expect(navigateMock).toHaveBeenCalledWith(-1)
  })

  it("falls back to home when there is no history entry", async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={[{ pathname: "/login" }]}>
        <StandalonePageBackProvider>
          <StandalonePageHeader />
        </StandalonePageBackProvider>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole("button", { name: "Go back" }))

    expect(navigateMock).toHaveBeenCalledWith("/")
  })
})
