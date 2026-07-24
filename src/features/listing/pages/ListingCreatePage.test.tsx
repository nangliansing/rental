import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useBuildingById } from "@/features/buildings/api"
import { useCreatePendingPost } from "@/features/pending-post"

import { ListingCreatePage } from "./ListingCreatePage"

vi.mock("@/features/buildings/api")
vi.mock("@/features/pending-post")
vi.mock("../components/ListingForm", () => ({
  ListingForm: () => <div>Listing form</div>,
}))
vi.mock("../components/BuildingForm", () => ({
  BuildingForm: ({
    onSubmit,
  }: {
    onSubmit: (values: Record<string, unknown>) => void
  }) => (
    <button
      type="button"
      onClick={() =>
        onSubmit({
          name: "Draft Residence",
          buildingType: "Apartment",
          address: "Draft address",
          facilities: ["Parking"],
          security: ["CCTV"],
        })
      }
    >
      Complete building
    </button>
  ),
}))

describe("ListingCreatePage", () => {
  beforeEach(() => {
    vi.mocked(useCreatePendingPost).mockReturnValue({
      mutateAsync: vi.fn(),
    } as never)
    vi.mocked(useBuildingById).mockReturnValue({
      data: {
        _id: "building-1",
        name: "Selected Residence",
        buildingType: "Apartment",
        address: "Selected address",
        facilities: ["Lift"],
        security: ["Keycard"],
        location: { type: "Point", coordinates: [100.5, 13.7] },
        minRent: 7_000,
        maxRent: 9_000,
      },
      isLoading: false,
      isError: false,
    } as never)
  })

  it("loads and displays the selected existing building instead of its raw id", () => {
    render(
      <MemoryRouter initialEntries={["/listings/new?buildingId=building-1"]}>
        <ListingCreatePage />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole("heading", { name: "Selected Residence" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Selected address")).toBeInTheDocument()
    expect(screen.queryByText("building-1")).not.toBeInTheDocument()
    expect(useBuildingById).toHaveBeenCalledWith({
      buildingId: "building-1",
      enabled: true,
    })
  })

  it("reuses the summary for a new-building draft and returns to editing", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={["/listings/new?lat=13.7&lng=100.5"]}>
        <ListingCreatePage />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole("button", { name: "Complete building" }))

    expect(
      screen.getByRole("heading", { name: "Draft Residence" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Lat 13.70000, Lng 100.50000")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Edit building" }))

    expect(
      screen.getByRole("button", { name: "Complete building" }),
    ).toBeInTheDocument()
  })
})
