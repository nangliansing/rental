import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { UserMenuProfileActionsMenu } from "./UserMenuProfileActionsMenu"

const openConfirmationMock = vi.fn()

vi.mock("@/features/auth/hooks/useLogoutConfirmation", () => ({
  useLogoutConfirmation: () => ({
    isConfirmationOpen: false,
    isSubmitting: false,
    errorMessage: "",
    openConfirmation: openConfirmationMock,
    closeConfirmation: vi.fn(),
    confirmLogout: vi.fn(),
  }),
}))

describe("UserMenuProfileActionsMenu", () => {
  beforeEach(() => {
    openConfirmationMock.mockReset()
  })

  it("toggles the dropdown from the gear trigger", async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <UserMenuProfileActionsMenu />
      </MemoryRouter>,
    )

    const trigger = screen.getByRole("button", { name: "Account actions" })

    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()

    await user.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("menu", { name: "Account actions" })).toBeInTheDocument()

    await user.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })

  it("calls onNavigate when edit account is selected", async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()

    render(
      <MemoryRouter>
        <UserMenuProfileActionsMenu onNavigate={onNavigate} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole("button", { name: "Account actions" }))
    await user.click(screen.getByRole("menuitem", { name: "Edit account" }))

    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  it("opens logout confirmation when log out is selected", async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <UserMenuProfileActionsMenu />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole("button", { name: "Account actions" }))
    await user.click(screen.getByRole("menuitem", { name: "Log out" }))

    expect(openConfirmationMock).toHaveBeenCalledTimes(1)
  })

  it("closes the menu when Escape is pressed", async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <UserMenuProfileActionsMenu />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole("button", { name: "Account actions" }))
    expect(screen.getByRole("menu")).toBeInTheDocument()

    await user.keyboard("{Escape}")
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })
})
