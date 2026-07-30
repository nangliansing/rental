import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createSearchListing } from "@/test/fixtures/listings"
import { __resetModalHistoryStackForTests } from "@/shared/utils/modalHistoryStack"

import { ListingDetailModal } from "../ListingDetailModal"
import { ListingGridCard } from "../ListingGridCard"
import {
  ListingGridPreviewPortal,
  useListingGridPreview,
} from "./index"

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isLoading: false,
    user: null,
  }),
}))

vi.mock("@/features/profile/api", () => ({
  useMyAgentProfile: () => ({
    canCreateListing: false,
  }),
}))

vi.mock("../../hooks/useListingDetailData", () => ({
  useListingDetailData: () => ({
    listing: createSearchListing({ _id: "listing-1" }),
    isLoading: false,
    viewerUserId: undefined,
  }),
}))

vi.mock("../ListingDetailContent", () => ({
  ListingDetailContent: () => <div>Listing detail body</div>,
}))

function PreviewToDetailHarness() {
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null)
  const preview = useListingGridPreview()
  const listing = createSearchListing()

  return (
    <>
      <ListingGridCard listing={listing} onActivate={preview.openPreview} />
      <ListingGridPreviewPortal
        preview={preview}
        onOpenDetail={setSelectedListingId}
      />
      <ListingDetailModal
        listingId={selectedListingId}
        onClose={() => setSelectedListingId(null)}
      />
    </>
  )
}

describe("listing grid preview detail handoff", () => {
  beforeEach(() => {
    __resetModalHistoryStackForTests()
    window.history.replaceState({}, "")
  })

  afterEach(() => {
    __resetModalHistoryStackForTests()
    window.history.replaceState({}, "")
    document.body.style.overflow = ""
  })

  it("keeps the detail modal open after transitioning from preview", async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <PreviewToDetailHarness />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole("button", { name: "Open listing ฿14k" }))
    await user.click(
      screen.getByRole("button", {
        name: "Preview listing ฿14k. Tap for full details.",
      }),
    )

    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { name: "Listing details" }),
      ).toBeInTheDocument()
    })
    expect(
      screen.queryByRole("dialog", { name: "Preview listing ฿14k" }),
    ).not.toBeInTheDocument()
  })

  it("closes detail from browser back after a preview handoff", async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <PreviewToDetailHarness />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole("button", { name: "Open listing ฿14k" }))
    await user.click(
      screen.getByRole("button", {
        name: "Preview listing ฿14k. Tap for full details.",
      }),
    )

    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { name: "Listing details" }),
      ).toBeInTheDocument()
    })

    window.dispatchEvent(new PopStateEvent("popstate"))

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Listing details" }),
      ).not.toBeInTheDocument()
    })
  })

  it("closes detail from the dismiss control after a preview handoff", async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <PreviewToDetailHarness />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole("button", { name: "Open listing ฿14k" }))
    await user.click(
      screen.getByRole("button", {
        name: "Preview listing ฿14k. Tap for full details.",
      }),
    )

    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { name: "Listing details" }),
      ).toBeInTheDocument()
    })

    await user.click(
      screen.getAllByRole("button", { name: "Close listing details" })[0]!,
    )

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Listing details" }),
      ).not.toBeInTheDocument()
    })
  })

  it("still syncs preview history when dismissed without handoff", async () => {
    const user = userEvent.setup()
    const back = vi.spyOn(window.history, "back")

    render(
      <MemoryRouter>
        <PreviewToDetailHarness />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole("button", { name: "Open listing ฿14k" }))
    back.mockClear()

    await user.keyboard("{Escape}")

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Preview listing ฿14k" }),
      ).not.toBeInTheDocument()
    })
    expect(back).toHaveBeenCalledOnce()
  })

  it("survives a popstate during the preview-to-detail transition", async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <PreviewToDetailHarness />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole("button", { name: "Open listing ฿14k" }))
    await user.click(
      screen.getByRole("button", {
        name: "Preview listing ฿14k. Tap for full details.",
      }),
    )

    window.dispatchEvent(new PopStateEvent("popstate"))

    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { name: "Listing details" }),
      ).toBeInTheDocument()
    })
  })
})
