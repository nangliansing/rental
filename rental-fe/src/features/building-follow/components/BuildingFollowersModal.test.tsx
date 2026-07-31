import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  useSearchBuildingFollowers: vi.fn(),
}))

vi.mock("../api/useSearchBuildingFollowers", () => ({
  useSearchBuildingFollowers: mocks.useSearchBuildingFollowers,
}))

vi.mock("./BuildingFollowersList", () => ({
  BuildingFollowersList: ({
    buildingId,
    enabled,
  }: {
    buildingId?: string
    enabled?: boolean
  }) => (
    <section aria-label="Building followers">
      List for {buildingId} enabled={String(enabled)}
    </section>
  ),
}))

import { BuildingFollowersModal } from "./BuildingFollowersModal"

const building = {
  _id: "building-1",
  name: "Sky Tower",
  buildingType: "Condo",
  address: "123 Main Street",
}

describe("BuildingFollowersModal", () => {
  beforeEach(() => {
    document.body.style.overflow = ""
    mocks.useSearchBuildingFollowers.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        pages: [{ data: { followers: [] }, pagination: { total: 1 } }],
      },
    })
  })

  it("renders nothing when closed", () => {
    const { container } = render(
      <BuildingFollowersModal
        isOpen={false}
        building={building}
        buildingId="building-1"
        onClose={vi.fn()}
        trackBrowserHistory={false}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing when the building id cannot be resolved", () => {
    const { container } = render(
      <BuildingFollowersModal
        isOpen
        building={{ ...building, _id: "  " }}
        buildingId=" "
        onClose={vi.fn()}
        trackBrowserHistory={false}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("renders the followers dialog with building context and list", () => {
    render(
      <BuildingFollowersModal
        isOpen
        building={building}
        buildingId="building-1"
        onClose={vi.fn()}
        trackBrowserHistory={false}
      />,
    )

    expect(
      screen.getByRole("dialog", { name: "Followers of Sky Tower" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Sky Tower" })).toBeInTheDocument()
    expect(screen.getByText("1 follower")).toBeInTheDocument()
    expect(screen.queryByText("Condo")).not.toBeInTheDocument()
    expect(screen.getByText("List for building-1 enabled=true")).toBeInTheDocument()
  })

  it("shows the follower count beneath the building name", () => {
    render(
      <BuildingFollowersModal
        isOpen
        building={building}
        buildingId="building-1"
        onClose={vi.fn()}
        trackBrowserHistory={false}
      />,
    )

    const heading = screen.getByRole("heading", { name: "Sky Tower" })
    expect(heading.nextElementSibling).toHaveTextContent("1 follower")
    expect(heading.nextElementSibling).toHaveClass("text-xs", "text-slate-500")
  })

  it("omits the follower count while the header total is still loading", () => {
    mocks.useSearchBuildingFollowers.mockReturnValue({
      isPending: true,
      isError: false,
      data: undefined,
    })

    render(
      <BuildingFollowersModal
        isOpen
        building={building}
        buildingId="building-1"
        onClose={vi.fn()}
        trackBrowserHistory={false}
      />,
    )

    expect(screen.getByRole("heading", { name: "Sky Tower" })).toBeInTheDocument()
    expect(screen.queryByText(/follower/i)).not.toBeInTheDocument()
  })

  it("formats plural follower counts in the header", () => {
    mocks.useSearchBuildingFollowers.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        pages: [{ data: { followers: [] }, pagination: { total: 12 } }],
      },
    })

    render(
      <BuildingFollowersModal
        isOpen
        building={building}
        buildingId="building-1"
        onClose={vi.fn()}
        trackBrowserHistory={false}
      />,
    )

    expect(screen.getByText("12 followers")).toBeInTheDocument()
  })

  it("falls back to a generic building title when the name is blank", () => {
    render(
      <BuildingFollowersModal
        isOpen
        building={{ ...building, name: "  " }}
        buildingId="building-1"
        onClose={vi.fn()}
        trackBrowserHistory={false}
      />,
    )

    expect(screen.getByRole("heading", { name: "Building" })).toBeInTheDocument()
  })

  it("resolves the building id from the building prop when omitted", () => {
    render(
      <BuildingFollowersModal
        isOpen
        building={building}
        onClose={vi.fn()}
        trackBrowserHistory={false}
      />,
    )

    expect(screen.getByText("List for building-1 enabled=true")).toBeInTheDocument()
  })

  it("uses the shared scrollable modal body class", () => {
    render(
      <BuildingFollowersModal
        isOpen
        building={building}
        buildingId="building-1"
        onClose={vi.fn()}
        trackBrowserHistory={false}
      />,
    )

    const dialog = screen.getByRole("dialog", { name: "Followers of Sky Tower" })
    expect(dialog.querySelector(".overflow-y-auto")).toBeInTheDocument()
  })

  it("closes through the dismiss header", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <BuildingFollowersModal
        isOpen
        building={building}
        buildingId="building-1"
        onClose={onClose}
        trackBrowserHistory={false}
      />,
    )

    await user.click(
      screen.getAllByRole("button", { name: "Close followers" })[0]!,
    )

    expect(onClose).toHaveBeenCalledOnce()
  })
})
