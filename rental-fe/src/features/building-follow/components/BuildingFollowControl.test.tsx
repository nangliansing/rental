import type { PropsWithChildren } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

const mocks = vi.hoisted(() => ({
  createBuildingFollow: vi.fn(),
  deleteBuildingFollow: vi.fn(),
  useAuth: vi.fn(),
}))

vi.mock("../api/createBuildingFollow", () => ({
  createBuildingFollow: mocks.createBuildingFollow,
  isBuildingAlreadyFollowedError: () => false,
}))

vi.mock("../api/deleteBuildingFollow", () => ({
  deleteBuildingFollow: mocks.deleteBuildingFollow,
  isBuildingFollowNotFoundError: () => false,
}))

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: mocks.useAuth,
}))

import { BuildingFollowControl } from "./BuildingFollowControl"

function seedBuildingFollowCache(
  queryClient: QueryClient,
  isFollowing: boolean,
) {
  queryClient.setQueryData(
    queryKeys.listings.publicDetail("listing-1", "user-1"),
    {
      listing: {
        _id: "listing-1",
        building: {
          _id: "building-1",
          name: "Sample",
          buildingType: "Apartment",
          isFollowing,
        },
      },
    },
  )
}

function renderControl({
  initialIsFollowing = false,
  pathname = "/map?buildingId=building-1",
}: {
  initialIsFollowing?: boolean
  pathname?: string
} = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  seedBuildingFollowCache(queryClient, initialIsFollowing)

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[pathname]}>
        <Routes>
          <Route
            path="/map"
            element={
              <BuildingFollowControl
                buildingId="building-1"
                initialIsFollowing={initialIsFollowing}
              />
            }
          />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function mockActiveUser() {
  mocks.useAuth.mockReturnValue({
    isAuthenticated: true,
    user: { _id: "user-1", status: "ACTIVE" },
  })
}

describe("BuildingFollowControl", () => {
  beforeEach(() => {
    mocks.createBuildingFollow.mockResolvedValue({
      _id: "follow-1",
      userId: "user-1",
      buildingId: "building-1",
    })
    mocks.deleteBuildingFollow.mockResolvedValue({
      _id: "follow-1",
      userId: "user-1",
      buildingId: "building-1",
    })
    mockActiveUser()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("redirects signed-out users to login with the current location", async () => {
    const user = userEvent.setup()
    mocks.useAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
    })

    renderControl({ pathname: "/map?buildingId=building-1&listingId=listing-1" })

    await user.click(screen.getByRole("button", { name: "Follow building" }))

    expect(await screen.findByText("Login page")).toBeInTheDocument()
    expect(mocks.createBuildingFollow).not.toHaveBeenCalled()
  })

  it("keeps the button disabled for non-active accounts without calling the API", async () => {
    const user = userEvent.setup()
    mocks.useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { _id: "user-1", status: "PENDING" },
    })

    renderControl()

    const button = screen.getByRole("button", { name: "Follow building" })
    expect(button).toBeDisabled()

    await user.click(button)

    expect(mocks.createBuildingFollow).not.toHaveBeenCalled()
    expect(mocks.deleteBuildingFollow).not.toHaveBeenCalled()
  })

  it("follows a building optimistically for active users", async () => {
    const user = userEvent.setup()

    renderControl({ initialIsFollowing: false })

    await user.click(screen.getByRole("button", { name: "Follow building" }))

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Unfollow building" }),
      ).toHaveAttribute("aria-pressed", "true")
    })
    expect(mocks.createBuildingFollow).toHaveBeenCalledOnce()
  })

  it("unfollows a building optimistically for active users", async () => {
    const user = userEvent.setup()

    renderControl({ initialIsFollowing: true })

    await user.click(screen.getByRole("button", { name: "Unfollow building" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Follow building" })).toHaveAttribute(
        "aria-pressed",
        "false",
      )
    })
    expect(mocks.deleteBuildingFollow).toHaveBeenCalledOnce()
  })

  it("plays the settle animation after the mutation completes", async () => {
    const user = userEvent.setup()

    renderControl({ initialIsFollowing: false })

    await user.click(screen.getByRole("button", { name: "Follow building" }))

    await waitFor(() => {
      expect(document.querySelector(".active-toggle-settle")).not.toBeNull()
    })
  })

  it("rolls back follow UI after a failed mutation", async () => {
    const user = userEvent.setup()
    mocks.createBuildingFollow.mockRejectedValueOnce(new Error("Network error"))

    renderControl({ initialIsFollowing: false })

    await user.click(screen.getByRole("button", { name: "Follow building" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Follow building" })).toHaveAttribute(
        "aria-pressed",
        "false",
      )
    })
  })
})
