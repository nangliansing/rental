import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  useSearchBuildingFollowers: vi.fn(),
}))

vi.mock("../api/useSearchBuildingFollowers", () => ({
  useSearchBuildingFollowers: mocks.useSearchBuildingFollowers,
}))

import { BuildingFollowersPreview } from "./BuildingFollowersPreview"

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
    isVerified: true,
  },
}

function renderPreview(overrides: Record<string, unknown> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <BuildingFollowersPreview
        buildingId="building-1"
        buildingName="Sky Tower"
        onOpen={vi.fn()}
        {...overrides}
      />
    </QueryClientProvider>,
  )
}

describe("BuildingFollowersPreview", () => {
  it("renders a skeleton while loading", () => {
    mocks.useSearchBuildingFollowers.mockReturnValue({
      isPending: true,
      isError: false,
      data: undefined,
    })

    renderPreview()

    expect(
      screen.getByLabelText("Loading building followers preview"),
    ).toBeInTheDocument()
  })

  it("renders nothing on error", () => {
    mocks.useSearchBuildingFollowers.mockReturnValue({
      isPending: false,
      isError: true,
      data: undefined,
    })

    const { container } = renderPreview()
    expect(container).toBeEmptyDOMElement()
  })

  it("renders an empty-state preview that still opens the modal", async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()

    mocks.useSearchBuildingFollowers.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        pages: [{ data: { followers: [] }, pagination: { total: 0 } }],
      },
    })

    renderPreview({ onOpen })

    expect(
      screen.getByText("No one follows this building yet"),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole("button", {
        name: "View followers of Sky Tower",
      }),
    )

    expect(onOpen).toHaveBeenCalledOnce()
  })

  it("opens the followers modal via the inline preview button", async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()

    mocks.useSearchBuildingFollowers.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        pages: [
          {
            data: { followers: [follower] },
            pagination: { page: 1, limit: 3, total: 48 },
          },
        ],
      },
    })

    renderPreview({ onOpen })

    await user.click(
      screen.getByRole("button", {
        name: "View all 48 followers of Sky Tower",
      }),
    )

    expect(onOpen).toHaveBeenCalledOnce()
    expect(screen.getByText(/and 47 others follow this building/)).toBeInTheDocument()
  })

  it("renders nothing when disabled or the building id is blank", () => {
    mocks.useSearchBuildingFollowers.mockReturnValue({
      isPending: false,
      isError: false,
      data: undefined,
    })

    const { container, rerender } = renderPreview({ enabled: false })
    expect(container).toBeEmptyDOMElement()

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <BuildingFollowersPreview
          buildingId="   "
          buildingName="Sky Tower"
          onOpen={vi.fn()}
        />
      </QueryClientProvider>,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
