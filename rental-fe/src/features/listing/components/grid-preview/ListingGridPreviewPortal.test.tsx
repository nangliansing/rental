import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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
  onOpenDetail,
  showBuildingName = true,
}: {
  onOpenDetail: (listingId: string) => void
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
        onOpenDetail={onOpenDetail}
      />
    </>
  )
}

describe("ListingGridPreviewPortal", () => {
  it("hands off preview history before opening detail", async () => {
    const onOpenDetail = vi.fn()

    previewController.previewListing = createSearchListing()
    previewController.closePreview.mockImplementation(() => {
      previewController.previewListing = null
    })

    render(<PreviewPortalHarness onOpenDetail={onOpenDetail} />)

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

  it("forwards showBuildingName to the preview modal", async () => {
    previewController.previewListing = createSearchListing()

    render(
      <PreviewPortalHarness
        showBuildingName={false}
        onOpenDetail={vi.fn()}
      />,
    )

    expect(screen.queryByText("Bangkapi Residence")).not.toBeInTheDocument()
  })
})
