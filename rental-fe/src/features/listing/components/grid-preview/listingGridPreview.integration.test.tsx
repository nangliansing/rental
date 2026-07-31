import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  createListingAgentProfile,
  createSearchBuilding,
  createSearchListing,
} from "@/test/fixtures/listings"

import { ListingGridCard } from "../ListingGridCard"
import {
  ListingGridPreviewPortal,
  useListingGridPreview,
} from "./index"

function GridPreviewHarness({
  listing = createSearchListing({ building: createSearchBuilding() }),
  showBuildingName = true,
  overlayDensity = "compact" as const,
  onOpenDetail = vi.fn(),
}: {
  listing?: ReturnType<typeof createSearchListing> & {
    building?: ReturnType<typeof createSearchBuilding>
  }
  showBuildingName?: boolean
  overlayDensity?: "compact" | "full"
  onOpenDetail?: (listingId: string) => void
}) {
  const preview = useListingGridPreview()

  return (
    <>
      <ListingGridCard
        listing={listing}
        showBuildingName={showBuildingName}
        overlayDensity={overlayDensity}
        onActivate={preview.openPreview}
      />
      <ListingGridPreviewPortal
        preview={preview}
        showBuildingName={showBuildingName}
        detailMode="modal"
        onOpenDetail={onOpenDetail}
      />
    </>
  )
}

describe("listing grid preview integration", () => {
  afterEach(() => {
    vi.useRealTimers()
    document.body.style.overflow = ""
  })

  describe("tile → preview → detail flow", () => {
    it("opens preview from the grid tile and then opens detail", async () => {
      const user = userEvent.setup()
      const onOpenDetail = vi.fn()
      const listing = createSearchListing({
        availableAt: "2026-07-29T00:00:00+07:00",
        building: createSearchBuilding(),
      })

      render(<GridPreviewHarness listing={listing} onOpenDetail={onOpenDetail} />)

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      expect(screen.getByLabelText("Available now")).toBeInTheDocument()
      expect(screen.queryByText(/^Dep /)).not.toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "Open listing ฿14k" }))

      const dialog = screen.getByRole("dialog", { name: "Preview listing ฿14k" })
      expect(dialog).toBeInTheDocument()
      expect(within(dialog).getByLabelText("Available now")).toBeInTheDocument()
      expect(within(dialog).getByText(/^Dep /)).toBeInTheDocument()
      expect(within(dialog).queryByText("Available now")).not.toBeInTheDocument()

      await user.click(
        screen.getByRole("button", {
          name: "Preview listing ฿14k. Tap for full details.",
        }),
      )

      expect(onOpenDetail).toHaveBeenCalledOnce()
      expect(onOpenDetail).toHaveBeenCalledWith("listing-1")
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("dismisses preview with Escape without opening detail", async () => {
      const user = userEvent.setup()
      const onOpenDetail = vi.fn()

      render(<GridPreviewHarness onOpenDetail={onOpenDetail} />)

      await user.click(screen.getByRole("button", { name: "Open listing ฿14k" }))
      expect(screen.getByRole("dialog")).toBeInTheDocument()

      await user.keyboard("{Escape}")

      expect(onOpenDetail).not.toHaveBeenCalled()
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("dismisses preview from the backdrop without opening detail", async () => {
      const user = userEvent.setup()
      const onOpenDetail = vi.fn()

      render(<GridPreviewHarness onOpenDetail={onOpenDetail} />)

      await user.click(screen.getByRole("button", { name: "Open listing ฿14k" }))

      const dialog = screen.getByRole("dialog")
      const backdrop = dialog.parentElement
      expect(backdrop).not.toBeNull()

      await user.click(backdrop!)

      expect(onOpenDetail).not.toHaveBeenCalled()
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  describe("building-context grids", () => {
    it("hides building name on tile and preview when showBuildingName is false", async () => {
      const user = userEvent.setup()
      const listing = createSearchListing({ building: createSearchBuilding() })

      render(
        <GridPreviewHarness listing={listing} showBuildingName={false} />,
      )

      expect(screen.queryByText("Bangkapi Residence")).not.toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "Open listing ฿14k" }))

      expect(
        within(screen.getByRole("dialog")).queryByText("Bangkapi Residence"),
      ).not.toBeInTheDocument()
    })

    it("shows lister attribution in building-context preview", async () => {
      const user = userEvent.setup()
      const listing = createSearchListing({
        building: createSearchBuilding(),
        agentProfile: createListingAgentProfile({
          displayName: "Mina Chen",
          isVerified: true,
          reviewSummary: {
            averageRating: 4.5,
            reviewCount: 35,
            ratingCounts: {
              oneStar: 0,
              twoStars: 0,
              threeStars: 0,
              fourStars: 10,
              fiveStars: 25,
            },
            tagCounts: [],
          },
        }),
      })

      render(
        <GridPreviewHarness listing={listing} showBuildingName={false} />,
      )

      await user.click(screen.getByRole("button", { name: "Open listing ฿14k" }))

      const dialog = within(screen.getByRole("dialog"))
      expect(dialog.getByText("Mina Chen")).toBeInTheDocument()
      expect(dialog.getByLabelText("Verified lister")).toBeInTheDocument()
      expect(dialog.getByText("4.5 (35)")).toBeInTheDocument()
    })

    it("does not show lister attribution outside building context", async () => {
      const user = userEvent.setup()
      const listing = createSearchListing({
        building: createSearchBuilding(),
        agentProfile: createListingAgentProfile({ displayName: "Mina Chen" }),
      })

      render(<GridPreviewHarness listing={listing} showBuildingName />)

      await user.click(screen.getByRole("button", { name: "Open listing ฿14k" }))

      expect(
        within(screen.getByRole("dialog")).queryByText("Mina Chen"),
      ).not.toBeInTheDocument()
    })
  })

  describe("availability presentation", () => {
    it("shows the dot on the tile and compact availability in preview for available now", async () => {
      const user = userEvent.setup()
      const listing = createSearchListing({
        availableAt: "2026-07-29T00:00:00+07:00",
      })

      render(<GridPreviewHarness listing={listing} showBuildingName={false} />)

      expect(screen.getByLabelText("Available now")).toBeInTheDocument()
      expect(screen.queryByText("Available now")).not.toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "Open listing ฿14k" }))

      expect(
        within(screen.getByRole("dialog")).getByLabelText("Available now"),
      ).toBeInTheDocument()
      expect(screen.getAllByLabelText("Available now")).toHaveLength(2)
    })

    it("shows no availability chip in preview for flexible listings", async () => {
      const user = userEvent.setup()
      const listing = createSearchListing({ availableAt: null })

      render(<GridPreviewHarness listing={listing} showBuildingName={false} />)

      expect(screen.queryByLabelText("Available now")).not.toBeInTheDocument()
      expect(screen.queryByLabelText("Flexible")).not.toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "Open listing ฿14k" }))

      const dialog = screen.getByRole("dialog")
      expect(within(dialog).queryByText("Flexible")).not.toBeInTheDocument()
      expect(within(dialog).queryByLabelText("Flexible")).not.toBeInTheDocument()
    })

    it("shows a compact future date in preview and on the tile", async () => {
      const user = userEvent.setup()
      const listing = createSearchListing({
        availableAt: "2026-08-15T00:00:00+07:00",
      })

      render(<GridPreviewHarness listing={listing} showBuildingName={false} />)

      expect(screen.queryByLabelText("Available now")).not.toBeInTheDocument()
      expect(screen.getByText("Aug 15")).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "Open listing ฿14k" }))

      expect(within(screen.getByRole("dialog")).getByText("Aug 15")).toBeInTheDocument()
      expect(
        within(screen.getByRole("dialog")).getByLabelText(
          "Available from Aug 15, 2026",
        ),
      ).toBeInTheDocument()
    })

    it("shows the dot for past availability that counts as available now", () => {
      render(
        <MemoryRouter>
          <ListingGridCard
            listing={createSearchListing({
              availableAt: "2026-07-29T00:00:00+07:00",
            })}
          />
        </MemoryRouter>,
      )

      expect(screen.getByLabelText("Available now")).toBeInTheDocument()
    })
  })

  describe("overlay density and listing metadata", () => {
    it("shows fine print on the tile only in full density mode", () => {
      const listing = createSearchListing({
        availableAt: null,
        building: createSearchBuilding(),
      })

      const { rerender } = render(
        <MemoryRouter>
          <ListingGridCard listing={listing} overlayDensity="compact" />
        </MemoryRouter>,
      )

      expect(screen.queryByText(/^Dep /)).not.toBeInTheDocument()
      expect(screen.queryByText("Flexible")).not.toBeInTheDocument()

      rerender(
        <MemoryRouter>
          <ListingGridCard listing={listing} overlayDensity="full" />
        </MemoryRouter>,
      )

      expect(screen.getByText(/^Dep /)).toBeInTheDocument()
      expect(screen.getByText("Flexible")).toBeInTheDocument()
      expect(screen.getByLabelText("Cooking allowed")).toBeInTheDocument()
    })

    it("renders private listing chrome and contract badge", async () => {
      const user = userEvent.setup()
      const listing = createSearchListing({
        visibility: "PRIVATE",
        contractMonths: 3,
        building: createSearchBuilding(),
      })

      render(<GridPreviewHarness listing={listing} />)

      expect(screen.getByLabelText("Private listing")).toBeInTheDocument()
      expect(screen.getByText("3 mo")).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "Open listing ฿14k" }))

      const dialog = screen.getByRole("dialog")
      expect(within(dialog).getByLabelText("Private listing")).toBeInTheDocument()
      expect(within(dialog).getByText("3 mo")).toBeInTheDocument()
    })
  })

  describe("defensive behavior", () => {
    it("does not open preview for listings without a valid id", async () => {
      const user = userEvent.setup()

      function InvalidIdHarness() {
        const preview = useListingGridPreview()
        const listing = createSearchListing({ _id: "   " as never })

        return (
          <>
            <button type="button" onClick={() => preview.openPreview(listing)}>
              Try open
            </button>
            <ListingGridPreviewPortal
              preview={preview}
              detailMode="modal"
              onOpenDetail={vi.fn()}
            />
          </>
        )
      }

      render(<InvalidIdHarness />)

      await user.click(screen.getByRole("button", { name: "Try open" }))

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("does not open detail when preview listing id is blank", async () => {
      const user = userEvent.setup()
      const onOpenDetail = vi.fn()
      const listing = createSearchListing({ _id: "   " as never })

      render(
        <ListingGridPreviewPortal
          preview={{
            previewListing: listing,
            isPreviewOpen: true,
            openPreview: vi.fn(),
            closePreview: vi.fn(),
            skipHistorySyncOnCloseRef: { current: false },
          }}
          detailMode="modal"
          onOpenDetail={onOpenDetail}
        />,
      )

      await user.click(
        screen.getByRole("button", {
          name: "Preview listing ฿14k. Tap for full details.",
        }),
      )

      expect(onOpenDetail).not.toHaveBeenCalled()
    })

    it("falls back safely when photo metadata is missing", async () => {
      const user = userEvent.setup()
      const listing = createSearchListing({
        media: [null, { secureUrl: " " }] as never,
        building: createSearchBuilding(),
      })

      render(<GridPreviewHarness listing={listing} />)

      expect(screen.getByRole("img", { name: "Listing photo" }).tagName).toBe("DIV")

      await user.click(screen.getByRole("button", { name: "Open listing ฿14k" }))

      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })

    it("keeps link-only cards navigable without preview wiring", () => {
      render(
        <MemoryRouter>
          <ListingGridCard listing={createSearchListing()} />
        </MemoryRouter>,
      )

      expect(
        screen.getByRole("link", { name: "Open listing ฿14k" }),
      ).toHaveAttribute("href", "/listings/listing-1")
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })
})
