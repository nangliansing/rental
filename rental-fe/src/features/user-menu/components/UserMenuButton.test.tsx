import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import { UserMenuButton } from "./UserMenuButton"

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      _id: "user-1",
      name: "Jane Doe",
      email: "jane@example.com",
      authProvider: "GOOGLE",
      role: "USER",
      status: "ACTIVE",
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-21T00:00:00.000Z",
    },
    isAuthenticated: true,
    isLoading: false,
  }),
}))

vi.mock("@/features/building-follow/api", () => ({
  useSearchUserBuildingFollows: () => ({
    data: {
      pages: [
        {
          data: {
            followings: [
              {
                _id: "follow-1",
                buildingId: "building-1",
                building: {
                  _id: "building-1",
                  name: "Bangkapi Residence",
                  address: "123 Lat Phrao Rd",
                },
              },
            ],
          },
          pagination: { page: 1, limit: 10, total: 1 },
        },
      ],
    },
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  }),
}))

vi.mock("@/features/auth/hooks/useLogoutConfirmation", () => ({
  useLogoutConfirmation: () => ({
    isConfirmationOpen: false,
    isSubmitting: false,
    errorMessage: "",
    openConfirmation: vi.fn(),
    closeConfirmation: vi.fn(),
    confirmLogout: vi.fn(),
  }),
}))

describe("UserMenuButton", () => {
  it("opens the account panel with profile and followed buildings", async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <UserMenuButton variant="desktop" />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole("button", { name: "Account menu" }))

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Account" })).toBeInTheDocument()
    })

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument()
    expect(screen.getByText("jane@example.com")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /View profile/i })).toHaveAttribute(
      "href",
      "/profile",
    )
    expect(screen.getByRole("link", { name: /Bangkapi Residence/i })).toHaveAttribute(
      "href",
      "/buildings/building-1",
    )
    expect(screen.getByRole("region", { name: "Account profile" })).toContainElement(
      screen.getByRole("button", { name: "Account actions" }),
    )
  })
})
