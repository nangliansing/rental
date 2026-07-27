import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { SearchBuilding } from "../../types"
import { VirtualizedBuildingList } from "./VirtualizedBuildingList"

const measureElement = vi.fn()

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: () => ({
    getTotalSize: () => 580,
    getVirtualItems: () => [
      { index: 0, start: 0 },
      { index: 1, start: 290 },
    ],
    measureElement,
  }),
}))

vi.mock("./BuildingListRow", () => ({
  BuildingListRow: ({ building }: { building: SearchBuilding }) => (
    <div role="listitem">
      <button type="button">{building.name}</button>
    </div>
  ),
}))

class ResizeObserverMock {
  observe = vi.fn()
  disconnect = vi.fn()
}

describe("VirtualizedBuildingList", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock)
  })

  it("renders only the rows selected by the virtualization engine", () => {
    const buildings = Array.from({ length: 40 }, (_, index) => ({
      _id: `building-${index}`,
      name: `Building ${index}`,
    })) as SearchBuilding[]
    const scrollRoot = document.createElement("div")

    render(
      <VirtualizedBuildingList
        buildings={buildings}
        totalCount={buildings.length}
        selectedBuildingId={null}
        isListingSearch={false}
        canCreateListing={false}
        scrollRootRef={{ current: scrollRoot }}
        onBuildingSelect={vi.fn()}
        onBuildingHoverChange={vi.fn()}
        onListExistingBuilding={vi.fn()}
      />,
    )

    expect(screen.getByRole("list", { name: "Buildings" })).toHaveStyle({
      height: "580px",
    })
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
    expect(screen.getByRole("button", { name: "Building 0" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Building 1" })).toBeVisible()
    expect(
      screen.queryByRole("button", { name: "Building 2" }),
    ).not.toBeInTheDocument()
  })
})
