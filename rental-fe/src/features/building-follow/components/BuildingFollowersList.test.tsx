import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  useSearchBuildingFollowers: vi.fn(),
  deleteBuildingFollow: vi.fn(),
}))

vi.mock("../api/useSearchBuildingFollowers", () => ({
  useSearchBuildingFollowers: mocks.useSearchBuildingFollowers,
}))

vi.mock("../api/useDeleteBuildingFollow", () => ({
  useDeleteBuildingFollow: () => ({
    mutate: mocks.deleteBuildingFollow,
    isPending: false,
  }),
}))

import { BuildingFollowersList } from "./BuildingFollowersList"

const follower = {
  _id: "follow-1",
  userId: "viewer-1",
  buildingId: "building-1",
  createdAt: "2026-07-31T10:15:30.123Z",
  updatedAt: "2026-07-31T10:15:30.123Z",
  user: {
    _id: "viewer-1",
    name: "Jane Doe",
    displayName: "Fetch Agent",
    profilePhoto: null,
    isVerified: false,
  },
}

function renderList(overrides: Record<string, unknown> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <BuildingFollowersList
        buildingId="building-1"
        viewerUserId="viewer-1"
        {...overrides}
      />
    </QueryClientProvider>,
  )
}

describe("BuildingFollowersList", () => {
  it("renders the initial loading skeleton", () => {
    mocks.useSearchBuildingFollowers.mockReturnValue({
      isPending: true,
      isError: false,
      data: undefined,
      refetch: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isFetchNextPageError: false,
      fetchNextPage: vi.fn(),
      isFetching: true,
    })

    renderList()

    expect(
      screen.getByLabelText("Loading building followers"),
    ).toBeInTheDocument()
  })

  it("renders an error state with retry", async () => {
    const user = userEvent.setup()
    const refetch = vi.fn()

    mocks.useSearchBuildingFollowers.mockReturnValue({
      isPending: false,
      isError: true,
      data: undefined,
      refetch,
      hasNextPage: false,
      isFetchingNextPage: false,
      isFetchNextPageError: false,
      fetchNextPage: vi.fn(),
      isFetching: false,
    })

    renderList()

    expect(screen.getByText("Could not load followers")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Try again" }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it("renders an empty state", () => {
    mocks.useSearchBuildingFollowers.mockReturnValue({
      isPending: false,
      isError: false,
      data: { pages: [{ data: { followers: [] }, pagination: { total: 0 } }] },
      refetch: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isFetchNextPageError: false,
      fetchNextPage: vi.fn(),
      isFetching: false,
    })

    renderList()

    expect(screen.getByText("No followers yet")).toBeInTheDocument()
  })

  it("renders list items without a separate count header", () => {
    mocks.useSearchBuildingFollowers.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        pages: [
          {
            data: { followers: [follower] },
            pagination: { page: 1, limit: 20, total: 1 },
          },
        ],
      },
      refetch: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isFetchNextPageError: false,
      fetchNextPage: vi.fn(),
      isFetching: false,
    })

    const { container } = renderList()

    expect(screen.queryByText("1 follower")).not.toBeInTheDocument()
    expect(screen.getByText("Fetch Agent")).toBeInTheDocument()
    expect(container.querySelector(".divide-y")).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Unfollow Fetch Agent" }),
    ).toBeInTheDocument()
  })

  it("calls delete follow when the viewer unfollows from the list", async () => {
    const user = userEvent.setup()

    mocks.useSearchBuildingFollowers.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        pages: [
          {
            data: { followers: [follower] },
            pagination: { page: 1, limit: 20, total: 1 },
          },
        ],
      },
      refetch: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isFetchNextPageError: false,
      fetchNextPage: vi.fn(),
      isFetching: false,
    })

    renderList()

    await user.click(screen.getByRole("button", { name: "Unfollow Fetch Agent" }))

    await waitFor(() => {
      expect(mocks.deleteBuildingFollow).toHaveBeenCalledWith(
        { buildingId: "building-1" },
        expect.any(Object),
      )
    })
  })
})
