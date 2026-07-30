import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { createSearchListing } from "@/test/fixtures/listings"

import { ListingGridPreviewPortal } from "./ListingGridPreviewPortal"
import { useListingGridPreview } from "./useListingGridPreview"

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
  it("closes preview before opening detail", async () => {
    const user = userEvent.setup()
    const onOpenDetail = vi.fn()

    render(<PreviewPortalHarness onOpenDetail={onOpenDetail} />)

    await user.click(screen.getByRole("button", { name: "Open preview" }))
    await user.click(
      screen.getByRole("button", {
        name: "Preview listing ฿14k. Tap for full details.",
      }),
    )

    expect(onOpenDetail).toHaveBeenCalledWith("listing-1")
    expect(
      screen.queryByRole("dialog", { name: "Preview listing ฿14k" }),
    ).not.toBeInTheDocument()
  })

  it("forwards showBuildingName to the preview modal", async () => {
    const user = userEvent.setup()

    render(
      <PreviewPortalHarness
        showBuildingName={false}
        onOpenDetail={vi.fn()}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Open preview" }))

    expect(screen.queryByText("Bangkapi Residence")).not.toBeInTheDocument()
  })
})
