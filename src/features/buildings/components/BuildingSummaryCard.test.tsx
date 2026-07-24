import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { BuildingSummaryCard } from "./BuildingSummaryCard"

const building = {
  name: "Bangkapi Residence",
  buildingType: "Apartment",
  address: "Lat Phrao Road, Bangkok",
  facilities: ["Parking", "Lift"],
  security: ["CCTV"],
  minRent: 5_000,
  maxRent: 8_000,
  location: { coordinates: [100.642, 13.7653] },
}

describe("BuildingSummaryCard", () => {
  it("renders the shared building summary defensively", () => {
    render(<BuildingSummaryCard building={building} titleLevel={2} />)

    expect(
      screen.getByRole("heading", { level: 2, name: "Bangkapi Residence" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Apartment")).toBeInTheDocument()
    expect(screen.getByText("Lat Phrao Road, Bangkok")).toBeInTheDocument()
    expect(screen.getByText("฿5k - ฿8k")).toBeInTheDocument()
    expect(screen.getByText("Parking")).toBeInTheDocument()
    expect(screen.getByText("CCTV")).toBeInTheDocument()
  })

  it("supports a contained context, coordinates, and contextual actions", async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const onListHere = vi.fn()
    const { container } = render(
      <BuildingSummaryCard
        building={building}
        variant="contained"
        canCreateListing
        showCoordinates
        editLabel="Edit building"
        onListHere={onListHere}
        onRequestEdit={onEdit}
      />,
    )

    expect(container.firstChild).toHaveClass("rounded-xl", "border")
    expect(
      screen.getByText("Lat 13.76530, Lng 100.64200"),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "List a room here" }))
    await user.click(screen.getByRole("button", { name: "Edit building" }))

    expect(onListHere).toHaveBeenCalledOnce()
    expect(onEdit).toHaveBeenCalledOnce()
  })

  it("handles partial draft data without showing empty rent", () => {
    render(
      <BuildingSummaryCard
        building={{ name: "Draft building" }}
        hideEmptyRent
      />,
    )

    expect(screen.getByRole("heading", { name: "Draft building" })).toBeInTheDocument()
    expect(screen.queryByText("No rent yet")).not.toBeInTheDocument()
  })
})
