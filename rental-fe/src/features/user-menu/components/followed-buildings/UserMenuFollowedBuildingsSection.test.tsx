import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { UserMenuFollowedBuildingsSection } from "./UserMenuFollowedBuildingsSection"

const useUserMenuFollowedBuildings = vi.hoisted(() => vi.fn())
const mutateMock = vi.hoisted(() => vi.fn())
const isPendingState = vi.hoisted(() => ({ value: false }))

vi.mock("../../hooks/useUserMenuFollowedBuildings", () => ({
  useUserMenuFollowedBuildings,
}))

vi.mock("@/features/building-follow/api/useDeleteBuildingFollow", () => ({
  useDeleteBuildingFollow: () => ({
    mutate: mutateMock,
    get isPending() {
      return isPendingState.value
    },
  }),
}))

vi.mock("@/shared/components/feedback/InfiniteScrollSentinel", () => ({
  InfiniteScrollSentinel: () => (
    <div role="status" aria-label="Infinite scroll sentinel">
      Load more sentinel
    </div>
  ),
}))

const followedBuilding = {
  _id: "follow-1",
  buildingId: "building-1",
  building: {
    _id: "building-1",
    name: "Bangkapi Residence",
    address: "Bang Kapi, Bangkok",
  },
}

describe("UserMenuFollowedBuildingsSection", () => {
  beforeEach(() => {
    mutateMock.mockReset()
    isPendingState.value = false
  })

  it("renders nothing when the user id is missing", () => {
    useUserMenuFollowedBuildings.mockReturnValue({
      followedBuildings: [],
      totalFollowedBuildings: 0,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isError: false,
      isFetchNextPageError: false,
      isFetchingNextPage: false,
      isLoading: false,
      isQueryEnabled: false,
      refetch: vi.fn(),
    })

    const { container } = render(
      <MemoryRouter>
        <UserMenuFollowedBuildingsSection userId="  " enabled />
      </MemoryRouter>,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("renders rows and an infinite scroll sentinel when data is available", () => {
    useUserMenuFollowedBuildings.mockReturnValue({
      followedBuildings: [followedBuilding],
      totalFollowedBuildings: 21,
      fetchNextPage: vi.fn(),
      hasNextPage: true,
      isError: false,
      isFetchNextPageError: false,
      isFetchingNextPage: false,
      isLoading: false,
      isQueryEnabled: true,
      refetch: vi.fn(),
    })

    render(
      <MemoryRouter>
        <UserMenuFollowedBuildingsSection userId="user-1" enabled />
      </MemoryRouter>,
    )

    expect(screen.getByRole("region", { name: "Followed buildings" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Bangkapi Residence/i })).toHaveAttribute(
      "href",
      "/buildings/building-1",
    )
    expect(
      screen.getByRole("button", { name: "Unfollow Bangkapi Residence" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("status", { name: "Infinite scroll sentinel" })).toBeInTheDocument()
  })

  it("unfollows a building through the shared delete mutation", async () => {
    const user = userEvent.setup()

    useUserMenuFollowedBuildings.mockReturnValue({
      followedBuildings: [followedBuilding],
      totalFollowedBuildings: 1,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isError: false,
      isFetchNextPageError: false,
      isFetchingNextPage: false,
      isLoading: false,
      isQueryEnabled: true,
      refetch: vi.fn(),
    })

    render(
      <MemoryRouter>
        <UserMenuFollowedBuildingsSection userId="user-1" enabled />
      </MemoryRouter>,
    )

    await user.click(
      screen.getByRole("button", { name: "Unfollow Bangkapi Residence" }),
    )

    expect(mutateMock).toHaveBeenCalledWith(
      { buildingId: "building-1" },
      expect.objectContaining({
        onSettled: expect.any(Function),
      }),
    )
  })

  it("disables unfollow actions while a delete mutation is pending", () => {
    isPendingState.value = true
    useUserMenuFollowedBuildings.mockReturnValue({
      followedBuildings: [followedBuilding],
      totalFollowedBuildings: 1,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isError: false,
      isFetchNextPageError: false,
      isFetchingNextPage: false,
      isLoading: false,
      isQueryEnabled: true,
      refetch: vi.fn(),
    })

    render(
      <MemoryRouter>
        <UserMenuFollowedBuildingsSection userId="user-1" enabled />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole("button", { name: "Unfollow Bangkapi Residence" }),
    ).toBeDisabled()
  })
})
