import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { UserMenuProfileSection } from "./UserMenuProfileSection"

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

const user = {
  _id: "user-1",
  name: "Jane Doe",
  email: "jane@example.com",
  profilePhoto: null,
  authProvider: "GOOGLE",
  role: "USER",
  status: "ACTIVE" as const,
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-21T00:00:00.000Z",
}

describe("UserMenuProfileSection", () => {
  beforeEach(() => {
    openConfirmationMock.mockReset()
  })

  it("shows account actions next to the user name", async () => {
    const userSession = userEvent.setup()
    const onNavigate = vi.fn()

    render(
      <MemoryRouter>
        <UserMenuProfileSection user={user} onNavigate={onNavigate} />
      </MemoryRouter>,
    )

    const profileSection = screen.getByRole("region", { name: "Account profile" })
    const actionsTrigger = screen.getByRole("button", { name: "Account actions" })

    expect(profileSection).toContainElement(screen.getByText("Jane Doe"))
    expect(profileSection).toContainElement(actionsTrigger)
    expect(
      screen.getByRole("link", { name: /View profile/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("link", { name: /Edit account/i }),
    ).not.toBeInTheDocument()

    await userSession.click(actionsTrigger)

    expect(screen.getByRole("menu", { name: "Account actions" })).toBeInTheDocument()
    expect(
      screen.getByRole("menuitem", { name: "Edit account" }),
    ).toHaveAttribute("href", "/account/edit")
    expect(screen.getByRole("menuitem", { name: "Log out" })).toBeInTheDocument()
  })

  it("closes the panel when edit account is selected", async () => {
    const userSession = userEvent.setup()
    const onNavigate = vi.fn()

    render(
      <MemoryRouter>
        <UserMenuProfileSection user={user} onNavigate={onNavigate} />
      </MemoryRouter>,
    )

    await userSession.click(screen.getByRole("button", { name: "Account actions" }))
    await userSession.click(screen.getByRole("menuitem", { name: "Edit account" }))

    expect(onNavigate).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })

  it("opens logout confirmation from the actions menu", async () => {
    const userSession = userEvent.setup()

    render(
      <MemoryRouter>
        <UserMenuProfileSection user={user} />
      </MemoryRouter>,
    )

    await userSession.click(screen.getByRole("button", { name: "Account actions" }))
    await userSession.click(screen.getByRole("menuitem", { name: "Log out" }))

    expect(openConfirmationMock).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })
})
