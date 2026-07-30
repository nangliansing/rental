import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps } from "react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

const building = {
  _id: "building-1",
  name: "Bangkapi Residence",
  buildingType: "Apartment",
  address: "Lat Phrao Road, Bangkok",
  facilities: ["Parking", "Lift"],
  security: ["CCTV"],
  minRent: 5_000,
  maxRent: 8_000,
  location: { coordinates: [100.642, 13.7653] },
}

const mockNavigate = vi.fn()

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  )

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}))

vi.mock("@/features/profile/api/useMyAgentProfile", () => ({
  useMyAgentProfile: vi.fn(),
}))

vi.mock("@/features/building-follow/components/BuildingFollowControl", () => ({
  BuildingFollowControl: () => (
    <button type="button" aria-label="Follow building">
      Follow
    </button>
  ),
}))

import { useAuth } from "@/features/auth/hooks/useAuth"
import { useMyAgentProfile } from "@/features/profile/api/useMyAgentProfile"
import { BuildingSummaryCard } from "./BuildingSummaryCard"

function renderCard(props: ComponentProps<typeof BuildingSummaryCard>) {
  return render(
    <MemoryRouter>
      <BuildingSummaryCard {...props} />
    </MemoryRouter>,
  )
}

function mockSignedInWithProfile() {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
  } as never)
  vi.mocked(useMyAgentProfile).mockReturnValue({
    canCreateListing: true,
    isPending: false,
  } as never)
}

describe("BuildingSummaryCard", () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    } as never)
    vi.mocked(useMyAgentProfile).mockReturnValue({
      canCreateListing: false,
      isPending: false,
    } as never)
  })

  describe("presentation", () => {
    it("renders the full building summary defensively", () => {
      renderCard({ building, titleLevel: 2 })

      expect(
        screen.getByRole("region", {
          name: "Building summary for Bangkapi Residence",
        }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("heading", { level: 2, name: "Bangkapi Residence" }),
      ).toBeInTheDocument()
      expect(screen.getByText("Apartment")).toBeInTheDocument()
      expect(screen.getByText("Lat Phrao Road, Bangkok")).toBeInTheDocument()
      expect(screen.getByText("฿5k - ฿8k")).toBeInTheDocument()
      expect(screen.getByText("Parking")).toBeInTheDocument()
      expect(screen.getByText("CCTV")).toBeInTheDocument()
    })

    it.each([
      ["panel", ["border-b", "border-slate-100"]],
      ["contained", ["rounded-xl", "border", "bg-white"]],
      ["embedded", []],
    ] as const)("renders the %s variant", (variant, classes) => {
      const { container } = renderCard({ building, variant })
      for (const className of classes) {
        expect(container.firstChild).toHaveClass(className)
      }
    })

    it.each([1, 2, 3] as const)("supports heading level h%s", (titleLevel) => {
      renderCard({ building, titleLevel })
      expect(
        screen.getByRole("heading", {
          level: titleLevel,
          name: "Bangkapi Residence",
        }),
      ).toBeInTheDocument()
    })

    it("shows coordinates only when requested", () => {
      const { rerender } = renderCard({ building, showCoordinates: true })

      expect(
        screen.getByText("Lat 13.76530, Lng 100.64200"),
      ).toBeInTheDocument()

      rerender(
        <MemoryRouter>
          <BuildingSummaryCard
            building={{
              ...building,
              location: { coordinates: [200, 13.7] },
            }}
            showCoordinates
          />
        </MemoryRouter>,
      )

      expect(
        screen.queryByText(/Lat 13\.76530, Lng 100\.64200/),
      ).not.toBeInTheDocument()
    })

    it("shows empty rent only when hideEmptyRent is false", () => {
      renderCard({
        building: { name: "Draft building" },
        hideEmptyRent: false,
      })

      expect(screen.getByText("No rent yet")).toBeInTheDocument()
    })

    it("formats equal min and max rent as a single value", () => {
      renderCard({
        building: {
          ...building,
          minRent: 7_000,
          maxRent: 7_000,
        },
      })

      expect(screen.getByText("฿7k+")).toBeInTheDocument()
    })

    it("omits optional sections when data is missing", () => {
      renderCard({
        building: { name: "Minimal building" },
        hideEmptyRent: true,
      })

      expect(screen.queryByText("Apartment")).not.toBeInTheDocument()
      expect(screen.queryByText(/Lat Phrao Road/)).not.toBeInTheDocument()
      expect(
        screen.queryByLabelText("Building facilities and security"),
      ).not.toBeInTheDocument()
    })

    it("falls back when building fields are malformed", () => {
      renderCard({
        building: {
          name: "   ",
          buildingType: 42 as never,
          address: null,
          facilities: ["Parking", "Parking"],
          minRent: -500,
        },
        hideEmptyRent: true,
      })

      expect(screen.getByRole("heading", { name: "Building" })).toBeInTheDocument()
      expect(screen.getByText("Parking")).toBeInTheDocument()
      expect(screen.queryByText("Apartment")).not.toBeInTheDocument()
    })

    it("applies custom className", () => {
      const { container } = renderCard({
        building,
        className: "custom-summary",
      })

      expect(container.firstChild).toHaveClass("custom-summary")
    })
  })

  describe("management actions", () => {
    it("hides management actions when the user is not signed in with a profile", () => {
      renderCard({ building, variant: "contained" })

      expect(
        screen.queryByRole("button", { name: "List a room here" }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole("button", { name: "Request building edit" }),
      ).not.toBeInTheDocument()
    })

    it("shows management actions when the user is signed in with a profile", async () => {
      const user = userEvent.setup()
      mockSignedInWithProfile()

      renderCard({ building, variant: "contained", showCoordinates: true })

      await user.click(screen.getByRole("button", { name: "List a room here" }))
      await user.click(
        screen.getByRole("button", { name: "Request building edit" }),
      )

      expect(mockNavigate).toHaveBeenNthCalledWith(
        1,
        "/listings/new?buildingId=building-1",
      )
      expect(mockNavigate).toHaveBeenNthCalledWith(
        2,
        "/buildings/building-1/edit",
      )
    })

    it("hides management actions while auth is loading", () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        isLoading: true,
      } as never)

      renderCard({ building })

      expect(
        screen.queryByRole("button", { name: "List a room here" }),
      ).not.toBeInTheDocument()
    })

    it("hides management actions while the profile query is pending", () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      } as never)
      vi.mocked(useMyAgentProfile).mockReturnValue({
        canCreateListing: false,
        isPending: true,
      } as never)

      renderCard({ building })

      expect(
        screen.queryByRole("button", { name: "List a room here" }),
      ).not.toBeInTheDocument()
    })

    it("hides management actions for signed-in users without a profile", () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      } as never)
      vi.mocked(useMyAgentProfile).mockReturnValue({
        canCreateListing: false,
        isPending: false,
      } as never)

      renderCard({ building })

      expect(
        screen.queryByRole("button", { name: "List a room here" }),
      ).not.toBeInTheDocument()
    })

    it("hides management actions when hideActions is true", () => {
      mockSignedInWithProfile()

      renderCard({ building, hideActions: true })

      expect(
        screen.queryByRole("button", { name: "List a room here" }),
      ).not.toBeInTheDocument()
    })

    it("hides management actions when the building has no id", () => {
      mockSignedInWithProfile()

      renderCard({
        building: {
          ...building,
          _id: "   ",
        },
      })

      expect(
        screen.queryByRole("button", { name: "List a room here" }),
      ).not.toBeInTheDocument()
    })

    it("uses custom management handlers when provided", async () => {
      const user = userEvent.setup()
      mockSignedInWithProfile()
      const onListHere = vi.fn()
      const onRequestEdit = vi.fn()

      renderCard({
        building,
        onListHere,
        onRequestEdit,
        editLabel: "Suggest an edit",
      })

      await user.click(screen.getByRole("button", { name: "List a room here" }))
      await user.click(screen.getByRole("button", { name: "Suggest an edit" }))

      expect(onListHere).toHaveBeenCalledOnce()
      expect(onRequestEdit).toHaveBeenCalledOnce()
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe("explore neighbourhood", () => {
    it("shows the explore button when a handler is provided", async () => {
      const user = userEvent.setup()
      const onExploreNeighbourhood = vi.fn()

      renderCard({
        building,
        onExploreNeighbourhood,
      })

      await user.click(
        screen.getByRole("button", { name: "Explore neighbourhood" }),
      )

      expect(onExploreNeighbourhood).toHaveBeenCalledOnce()
    })

    it("hides the explore button when no handler is provided", () => {
      renderCard({ building })

      expect(
        screen.queryByRole("button", { name: "Explore neighbourhood" }),
      ).not.toBeInTheDocument()
    })
  })

  describe("draft edit action", () => {
    it("supports a draft edit action without management actions", async () => {
      const user = userEvent.setup()
      const onEditDraft = vi.fn()

      renderCard({
        building: { name: "Draft building" },
        hideEmptyRent: true,
        onEditDraft,
      })

      expect(
        screen.queryByRole("button", { name: "List a room here" }),
      ).not.toBeInTheDocument()
      await user.click(screen.getByRole("button", { name: "Edit building" }))
      expect(onEditDraft).toHaveBeenCalledOnce()
    })

    it("supports draft edit alongside management actions", async () => {
      const user = userEvent.setup()
      mockSignedInWithProfile()
      const onEditDraft = vi.fn()

      renderCard({
        building,
        onEditDraft,
        editDraftLabel: "Back to building form",
      })

      await user.click(screen.getByRole("button", { name: "Back to building form" }))
      expect(onEditDraft).toHaveBeenCalledOnce()
      expect(
        screen.getByRole("button", { name: "List a room here" }),
      ).toBeInTheDocument()
    })
  })
})
