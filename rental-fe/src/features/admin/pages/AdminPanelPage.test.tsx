import { http, HttpResponse } from "msw"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/test/renderWithProviders"
import { server } from "@/test/server"

import { AdminPanelPage } from "./AdminPanelPage"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
}))

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => mocks.auth(),
}))

function adminPendingPostsHandler() {
  return http.get("/api/v1/admin/pending-posts", () =>
    HttpResponse.json({
      success: true,
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
      },
    }),
  )
}

function setAuthState({
  isLoading = false,
  isAuthenticated = false,
  role = "USER",
}: {
  isLoading?: boolean
  isAuthenticated?: boolean
  role?: "USER" | "ADMIN" | "OWNER"
}) {
  mocks.auth.mockReturnValue({
    user: isAuthenticated
      ? {
          _id: "user-1",
          name: "Admin User",
          email: "admin@example.com",
          role,
          status: "ACTIVE",
        }
      : null,
    isAuthenticated,
    isLoading,
  })
}

describe("AdminPanelPage", () => {
  it("shows a loading state while auth resolves", () => {
    setAuthState({ isLoading: true })

    renderWithProviders(<AdminPanelPage />)

    expect(screen.getByText("Checking admin access...")).toBeInTheDocument()
  })

  it("requires sign-in before opening the admin panel", () => {
    setAuthState({ isAuthenticated: false })

    renderWithProviders(<AdminPanelPage />)

    expect(screen.getByText("Admin sign in required")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Log in" }),
    ).toHaveAttribute("href", "/login?redirect=/admin")
  })

  it("blocks non-admin users", () => {
    setAuthState({ isAuthenticated: true, role: "USER" })

    renderWithProviders(<AdminPanelPage />)

    expect(
      screen.getByRole("heading", { name: "Admin access required" }),
    ).toBeInTheDocument()
  })

  it("loads the review center for admin users", async () => {
    setAuthState({ isAuthenticated: true, role: "ADMIN" })
    server.use(adminPendingPostsHandler())

    renderWithProviders(<AdminPanelPage />)

    expect(
      await screen.findByRole("heading", { name: "Review center" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Pending listings", level: 2 }),
    ).toBeInTheDocument()
    expect(screen.getByText("ADMIN")).toBeInTheDocument()
  })

  it("switches workspace tabs for admin users", async () => {
    setAuthState({ isAuthenticated: true, role: "OWNER" })
    server.use(
      adminPendingPostsHandler(),
      http.get("/api/v1/admin/building-edit-requests", () =>
        HttpResponse.json({
          success: true,
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
          },
        }),
      ),
    )

    const { user } = renderWithProviders(<AdminPanelPage />)

    expect(
      await screen.findByRole("heading", { name: "Review center" }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Building edits" }))

    expect(
      await screen.findByRole("heading", { name: "Building edits", level: 2 }),
    ).toBeInTheDocument()
  })
})
