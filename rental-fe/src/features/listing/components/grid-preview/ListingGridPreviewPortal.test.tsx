import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import { createSearchListing } from "@/test/fixtures/listings"

import { ListingGridPreviewPortal } from "./ListingGridPreviewPortal"
import { useListingGridPreview } from "./useListingGridPreview"

const previewController = vi.hoisted(() => ({
  previewListing: null as ReturnType<typeof createSearchListing> | null,
  closePreview: vi.fn(),
  skipHistorySyncOnCloseRef: { current: false },
}))

vi.mock("./useListingGridPreview", () => ({
  useListingGridPreview: () => ({
    previewListing: previewController.previewListing,
    isPreviewOpen: previewController.previewListing != null,
    openPreview: vi.fn(),
    closePreview: previewController.closePreview,
    skipHistorySyncOnCloseRef: previewController.skipHistorySyncOnCloseRef,
  }),
}))

function PreviewPortalHarness({
  detailConfig,
  showBuildingName = true,
}: {
  detailConfig:
    | {
        detailMode: "modal"
        onOpenDetail: (listingId: string) => void
      }
    | {
        detailMode: "link"
        resolveDetailLink: (listingId: string) => {
          to: string
          state?: unknown
        } | null
      }
  showBuildingName?: boolean
}) {
  const preview = useListingGridPreview()

  return (
    <>
      <button
        type="button"
        onClick={() => preview.openPreview(createSearchListing())}
      >
        Open preview
      </button>
      <ListingGridPreviewPortal
        preview={preview}
        showBuildingName={showBuildingName}
        {...detailConfig}
      />
    </>
  )
}

describe("ListingGridPreviewPortal", () => {
  it("uses modal mode to hand off preview history before opening detail", async () => {
    const onOpenDetail = vi.fn()

    previewController.previewListing = createSearchListing()
    previewController.closePreview.mockImplementation(() => {
      previewController.previewListing = null
    })

    render(
      <MemoryRouter>
        <PreviewPortalHarness
          detailConfig={{ detailMode: "modal", onOpenDetail }}
        />
      </MemoryRouter>,
    )

    await userEvent.setup().click(
      screen.getByRole("button", {
        name: "Preview listing ฿14k. Tap for full details.",
      }),
    )

    expect(previewController.closePreview).toHaveBeenCalledWith({
      handoffToDetail: true,
    })
    expect(onOpenDetail).toHaveBeenCalledWith("listing-1")
  })

  it("uses link mode to navigate to a routed detail page", async () => {
    previewController.previewListing = createSearchListing()
    previewController.closePreview.mockImplementation(() => {
      previewController.previewListing = null
    })

    render(
      <MemoryRouter>
        <PreviewPortalHarness
          detailConfig={{
            detailMode: "link",
            resolveDetailLink: (listingId) => ({
              to: `/listings/${listingId}`,
              state: { returnTo: "/buildings/building-1" },
            }),
          }}
        />
      </MemoryRouter>,
    )

    expect(
      screen.queryByRole("button", {
        name: "Preview listing ฿14k. Tap for full details.",
      }),
    ).not.toBeInTheDocument()

    const detailLink = screen.getByRole("link", {
      name: "Preview listing ฿14k. Tap for full details.",
    })

    expect(detailLink).toHaveAttribute("href", "/listings/listing-1")

    await userEvent.setup().click(detailLink)

    expect(previewController.closePreview).toHaveBeenCalledWith({
      handoffToDetail: true,
    })
  })

  it("forwards showBuildingName to the preview modal", async () => {
    previewController.previewListing = createSearchListing()

    render(
      <MemoryRouter>
        <PreviewPortalHarness
          showBuildingName={false}
          detailConfig={{ detailMode: "modal", onOpenDetail: vi.fn() }}
        />
      </MemoryRouter>,
    )

    expect(screen.queryByText("Bangkapi Residence")).not.toBeInTheDocument()
  })
})
