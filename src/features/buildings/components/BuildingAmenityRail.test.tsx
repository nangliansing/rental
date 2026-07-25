import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { BuildingAmenityRail } from "./BuildingAmenityRail"

describe("BuildingAmenityRail", () => {
  it("renders facilities and security in a horizontal amenity rail", () => {
    const { container } = render(
      <BuildingAmenityRail
        facilities={["Parking", "Gym", "Swimming Pool"]}
        security={["CCTV", "Keycard Access"]}
      />,
    )

    expect(
      screen.getByLabelText("Building facilities and security"),
    ).toBeInTheDocument()
    expect(screen.getByText("Parking")).toBeInTheDocument()
    expect(screen.getByText("Gym")).toBeInTheDocument()
    expect(screen.getByText("Pool")).toBeInTheDocument()
    expect(screen.getByText("CCTV")).toBeInTheDocument()
    expect(screen.getByText("Keycard")).toBeInTheDocument()

    expect(container.firstChild).toHaveClass("overflow-x-auto")
    expect(container.querySelectorAll('[class*="rounded-full"]').length).toBe(5)
  })

  it("renders only facilities or only security", () => {
    const { rerender, container } = render(
      <BuildingAmenityRail facilities={["Lift"]} security={[]} />,
    )

    expect(screen.getByText("Lift")).toBeInTheDocument()
    expect(container.querySelectorAll('[class*="rounded-full"]').length).toBe(1)

    rerender(<BuildingAmenityRail facilities={[]} security={["CCTV"]} />)

    expect(screen.getByText("CCTV")).toBeInTheDocument()
    expect(container.querySelectorAll('[class*="rounded-full"]').length).toBe(1)
  })

  it("deduplicates malformed amenity values", () => {
    render(
      <BuildingAmenityRail
        facilities={["Gym", "Gym", " ", null as never]}
        security={["CCTV", 42 as never]}
      />,
    )

    expect(screen.getByText("Gym")).toBeInTheDocument()
    expect(screen.getByText("CCTV")).toBeInTheDocument()
    expect(screen.queryAllByText("Gym")).toHaveLength(1)
  })

  it("renders nothing when there are no amenities", () => {
    const { container } = render(
      <BuildingAmenityRail facilities={[]} security={null} />,
    )

    expect(container.firstChild).toBeNull()
  })
})
