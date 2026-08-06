import type { ReactNode } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SavedSearchesButton } from "./SavedSearchesButton"

const mockUseAuth = vi.hoisted(() => vi.fn())

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: mockUseAuth,
}))

vi.mock("@/shared/components/ModalPortal", () => ({
  ModalPortal: ({ children }: { children: ReactNode }) => (
    <div data-testid="modal-portal">{children}</div>
  ),
}))

vi.mock(
  "@/features/saved-search/components/SavedSearchDrawerPanel",
  () => ({
    SavedSearchDrawerPanel: () => (
      <div data-testid="saved-search-drawer-panel">Saved search list</div>
    ),
  }),
)

const activeAuth = {
  user: { status: "ACTIVE" },
  isAuthenticated: true,
  isLoading: false,
}

describe("SavedSearchesButton", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(activeAuth)
  })

  it("hides the button when the user is not authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })

    render(<SavedSearchesButton variant="desktop" />)

    expect(
      screen.queryByRole("button", { name: "Saved searches" }),
    ).not.toBeInTheDocument()
  })

  it("hides the button while auth is loading", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
    })

    render(<SavedSearchesButton variant="desktop" />)

    expect(
      screen.queryByRole("button", { name: "Saved searches" }),
    ).not.toBeInTheDocument()
  })

  it("opens a desktop floating panel from the trigger", async () => {
    const user = userEvent.setup()

    render(<SavedSearchesButton variant="desktop" />)

    const trigger = screen.getByRole("button", { name: "Saved searches" })
    expect(trigger).toHaveAttribute("aria-expanded", "false")

    await user.click(trigger)

    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(
      screen.getByRole("heading", { name: "Saved searches" }),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.getByTestId("saved-search-drawer-panel"),
      ).toBeInTheDocument()
    })
  })

  it("anchors the desktop panel under the trigger button", async () => {
    const user = userEvent.setup()

    render(<SavedSearchesButton variant="desktop" />)

    const trigger = screen.getByRole("button", { name: "Saved searches" })
    trigger.getBoundingClientRect = () =>
      ({
        top: 40,
        bottom: 88,
        left: 200,
        right: 248,
        width: 48,
        height: 48,
        x: 200,
        y: 40,
        toJSON: () => ({}),
      }) satisfies DOMRect

    await user.click(trigger)

    const panel = screen
      .getByRole("heading", { name: "Saved searches" })
      .closest("section")
    expect(panel).toHaveStyle({ top: "96px", left: "200px" })
  })

  it("opens a full-screen style panel on mobileFullscreen", async () => {
    const user = userEvent.setup()

    render(<SavedSearchesButton variant="mobileFullscreen" />)

    await user.click(screen.getByRole("button", { name: "Saved searches" }))

    expect(
      screen.getByRole("heading", { name: "Saved searches" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Close saved searches" }),
    ).toBeInTheDocument()
  })
})
