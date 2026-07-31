import { render, screen } from "@testing-library/react"
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

import { BuildingFollowersSection } from "./BuildingFollowersSection"

const building = {
  _id: "building-1",
  name: "Sky Tower",
  buildingType: "Condo",
  address: "123 Main Street",
}

const follower = {
  _id: "follow-1",
  userId: "user-1",
  buildingId: "building-1",
  createdAt: "2026-07-31T10:15:30.123Z",
  updatedAt: "2026-07-31T10:15:30.123Z",
  user: {
    _id: "user-1",
    name: "Jane Doe",
    displayName: "Fetch Agent",
    profilePhoto: null,
    isVerified: false,
  },
}

function mockFollowersQuery(overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  })
}

function renderSection(overrides: Record<string, unknown> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <BuildingFollowersSection
        building={building}
        viewerUserId="user-1"
        trackBrowserHistory={false}
        {...overrides}
      />
    </QueryClientProvider>,
  )
}

describe("BuildingFollowersSection", () => {
  it("opens the followers modal from the preview", async () => {
    const user = userEvent.setup()
    mockFollowersQuery()

    renderSection()

    await user.click(
      screen.getByRole("button", {
        name: "View 1 follower of Sky Tower",
      }),
    )

    expect(
      screen.getByRole("dialog", { name: "Followers of Sky Tower" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Sky Tower" })).toBeInTheDocument()
    expect(screen.getByText("1 follower")).toBeInTheDocument()
    expect(screen.queryByText("Condo")).not.toBeInTheDocument()
    expect(screen.queryByText("123 Main Street")).not.toBeInTheDocument()
    expect(
      screen.getByRole("article", { name: "Follower Fetch Agent" }),
    ).toBeInTheDocument()
  })

  it("closes the followers modal", async () => {
    const user = userEvent.setup()
    mockFollowersQuery()

    renderSection()

    await user.click(
      screen.getByRole("button", {
        name: "View 1 follower of Sky Tower",
      }),
    )

    const closeButtons = screen.getAllByRole("button", {
      name: "Close followers",
    })
    await user.click(closeButtons[0]!)

    expect(
      screen.queryByRole("dialog", { name: "Followers of Sky Tower" }),
    ).not.toBeInTheDocument()
  })

  it("returns null when the building id is missing or the section is disabled", () => {
    mockFollowersQuery()

    const { container: missingId } = renderSection({
      building: { ...building, _id: "  " },
    })
    expect(missingId).toBeEmptyDOMElement()

    const { container: disabled } = renderSection({ enabled: false })
    expect(disabled).toBeEmptyDOMElement()
  })

  it("hides the preview when the followers query fails", () => {
    mockFollowersQuery({ isError: true, data: undefined })

    renderSection()

    expect(
      screen.queryByRole("button", { name: /View followers of Sky Tower/i }),
    ).not.toBeInTheDocument()
  })

  it("opens the modal from the empty-state preview", async () => {
    const user = userEvent.setup()
    mockFollowersQuery({
      data: {
        pages: [{ data: { followers: [] }, pagination: { total: 0 } }],
      },
    })

    renderSection()

    await user.click(
      screen.getByRole("button", {
        name: "View followers of Sky Tower",
      }),
    )

    expect(
      screen.getByRole("dialog", { name: "Followers of Sky Tower" }),
    ).toBeInTheDocument()
    expect(screen.getByText("0 followers")).toBeInTheDocument()
    expect(screen.getByText("No followers yet")).toBeInTheDocument()
  })

  it("does not repeat the follower count inside the list body", async () => {
    const user = userEvent.setup()
    mockFollowersQuery()

    renderSection()

    await user.click(
      screen.getByRole("button", {
        name: "View 1 follower of Sky Tower",
      }),
    )

    expect(screen.getAllByText("1 follower")).toHaveLength(1)
  })
})
