import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useBuildingById } from "@/features/buildings/api"
import { useCreatePendingPost } from "@/features/pending-post"

import { ListingCreatePage } from "./ListingCreatePage"

const gateMocks = vi.hoisted(() => ({
  gate: vi.fn(),
}))

vi.mock("@/features/buildings/api")
vi.mock("@/features/pending-post")
vi.mock("@/features/profile/hooks/useMyProfileGate", () => ({
  useMyProfileGate: () => gateMocks.gate(),
}))
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    isLoading: false,
  })),
}))
vi.mock("@/features/profile/api/useMyAgentProfile", () => ({
  useMyAgentProfile: vi.fn(() => ({
    canCreateListing: true,
    isPending: false,
    data: { _id: "profile-1" },
  })),
}))
vi.mock("../components/ListingForm", () => ({
  ListingForm: ({
    onSubmit,
  }: {
    onSubmit: (values: Record<string, unknown>) => void | Promise<void>
  }) => (
    <button
      type="button"
      onClick={() =>
        onSubmit({
          visibility: "PUBLIC",
          rent: 14000,
          deposit: 28000,
          moveInCost: 42000,
          bedroomCount: 1,
          bathroomCount: 1,
          kitchenType: "Kitchen",
          contractMonths: 12,
          occupancy: 1,
          facilities: [],
          media: [],
          description: "Smoke listing",
        })
      }
    >
      Submit listing form
    </button>
  ),
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

function setGate(overrides: Record<string, unknown> = {}) {
  gateMocks.gate.mockReturnValue({
    isAuthenticated: true,
    isAuthLoading: false,
    isProfileLoading: false,
    isMissing: false,
    profile: { _id: "profile-1", displayName: "Lister" },
    profileQuery: { refetch: vi.fn() },
    showLogin: false,
    showProfileError: false,
    errorMessage: "",
    ...overrides,
  })
}

describe("ListingCreatePage", () => {
  beforeEach(() => {
    setGate()
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

  it("requires login before showing the listing form", () => {
    setGate({
      isAuthenticated: false,
      profile: undefined,
      showLogin: true,
    })

    render(
      <MemoryRouter initialEntries={["/listings/new?buildingId=building-1"]}>
        <ListingCreatePage />
      </MemoryRouter>,
    )

    expect(screen.getByRole("heading", { name: "Log in to list a room" })).toBeInTheDocument()
    expect(screen.queryByText("Submit listing form")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login?redirect=%2Flistings%2Fnew%3FbuildingId%3Dbuilding-1",
    )
  })

  it("requires a contact profile before showing the listing form", () => {
    setGate({
      isMissing: true,
      profile: undefined,
    })

    render(
      <MemoryRouter initialEntries={["/listings/new?buildingId=building-1"]}>
        <ListingCreatePage />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole("heading", { name: "Create your contact profile first" }),
    ).toBeInTheDocument()
    expect(screen.queryByText("Submit listing form")).not.toBeInTheDocument()
  })

  it("shows a success screen after submitting a pending post", async () => {
    const user = userEvent.setup()
    const mutateAsync = vi.fn().mockResolvedValue({
      _id: "pending-smoke-1",
      status: "PENDING",
      submittedBy: "user-1",
    })

    vi.mocked(useCreatePendingPost).mockReturnValue({
      mutateAsync,
    } as never)

    render(
      <MemoryRouter initialEntries={["/listings/new?buildingId=building-1"]}>
        <ListingCreatePage />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole("button", { name: "Submit listing form" }))

    expect(mutateAsync).toHaveBeenCalledWith({
      existingBuildingId: "building-1",
      listing: expect.objectContaining({
        rent: 14000,
        description: "Smoke listing",
      }),
    })
    expect(
      await screen.findByRole("heading", { name: "Submitted for review" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Go to profile" })).toHaveAttribute(
      "href",
      "/profile",
    )
    expect(screen.getByText("Reference: pending-smoke-1")).toBeInTheDocument()
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
