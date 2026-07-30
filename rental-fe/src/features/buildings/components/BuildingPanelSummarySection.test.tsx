import type { ComponentProps } from "react"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import type { BuildingSummaryData } from "../utils/buildingSummaryDisplay"
import { BuildingPanelSummarySection } from "./BuildingPanelSummarySection"

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: false,
    isLoading: false,
  })),
}))

vi.mock("@/features/profile/api/useMyAgentProfile", () => ({
  useMyAgentProfile: vi.fn(() => ({
    data: undefined,
    isLoading: false,
  })),
}))

vi.mock("@/features/building-follow/components/BuildingFollowControl", () => ({
  BuildingFollowControl: () => null,
}))

const building: BuildingSummaryData = {
  _id: "building-1",
  name: "Harbour View",
  buildingType: "Residential",
  address: "1 Example Street",
  minRent: 12000,
  maxRent: 18000,
  facilities: [],
  security: [],
}

function renderSection(
  props: ComponentProps<typeof BuildingPanelSummarySection>,
) {
  return render(
    <MemoryRouter>
      <BuildingPanelSummarySection {...props} />
    </MemoryRouter>,
  )
}

describe("BuildingPanelSummarySection", () => {
  it("renders an embedded summary inside panel gutters", () => {
    const { container } = renderSection({ building })

    expect(
      screen.getByRole("region", { name: /building summary/i }),
    ).toBeInTheDocument()
    expect(screen.getByText("Harbour View")).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass("bg-[#f1f3f4]", "-mx-4")
  })

  it("returns null when building data is missing", () => {
    const { container } = renderSection({ building: null })

    expect(container).toBeEmptyDOMElement()
  })

  it("supports flush gutters for full-width surfaces", () => {
    const { container } = renderSection({ building, breakout: "flush" })

    expect(container.firstElementChild).not.toHaveClass("-mx-4")
  })
})
