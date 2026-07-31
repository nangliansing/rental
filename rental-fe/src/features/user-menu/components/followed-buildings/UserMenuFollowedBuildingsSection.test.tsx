import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import { UserMenuFollowedBuildingsSection } from "./UserMenuFollowedBuildingsSection"

const useUserMenuFollowedBuildings = vi.hoisted(() => vi.fn())

vi.mock("../../hooks/useUserMenuFollowedBuildings", () => ({
  useUserMenuFollowedBuildings,
}))

vi.mock("@/shared/components/feedback/InfiniteScrollSentinel", () => ({
  InfiniteScrollSentinel: () => (
    <div role="status" aria-label="Infinite scroll sentinel">
      Load more sentinel
    </div>
  ),
}))

describe("UserMenuFollowedBuildingsSection", () => {
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
      followedBuildings: [
        {
          _id: "follow-1",
          buildingId: "building-1",
          building: {
            _id: "building-1",
            name: "Bangkapi Residence",
            address: "Bang Kapi, Bangkok",
          },
        },
      ],
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
    expect(screen.getByRole("status", { name: "Infinite scroll sentinel" })).toBeInTheDocument()
  })
})
