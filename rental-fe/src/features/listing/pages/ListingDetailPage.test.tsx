import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createSearchListing } from "@/test/fixtures/listings"

import { ListingDetailPage } from "./ListingDetailPage"

const navigateMock = vi.fn()
const scrollToMock = vi.fn()

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  )

  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

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

vi.mock("@/shared/hooks/useNavigateBack", () => ({
  useNavigateBack: () => vi.fn(),
}))

vi.mock("../hooks/useListingDetailData", () => ({
  useListingDetailData: () => ({
    listing: createSearchListing({ _id: "listing-1" }),
    isLoading: false,
    viewerUserId: undefined,
  }),
}))

vi.mock("../components/ListingDetailContent", () => ({
  ListingDetailContent: ({
    onListingSelect,
  }: {
    onListingSelect?: (listingId: string) => void
  }) => (
    <>
      <button
        type="button"
        onClick={() => onListingSelect?.("listing-2")}
      >
        Open sibling listing
      </button>
      <button
        type="button"
        onClick={() => onListingSelect?.("listing-1")}
      >
        Open current listing
      </button>
      <button
        type="button"
        onClick={() => onListingSelect?.("   ")}
      >
        Open blank listing
      </button>
    </>
  ),
}))

function renderPage(initialEntry = "/listings/listing-1") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/listings/:listingId" element={<ListingDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe("ListingDetailPage", () => {
  beforeEach(() => {
    navigateMock.mockReset()
    scrollToMock.mockReset()
    window.scrollTo = scrollToMock
  })

  it("navigates to another listing from the detail content callback", async () => {
    const user = userEvent.setup()

    renderPage()

    await user.click(screen.getByRole("button", { name: "Open sibling listing" }))

    expect(navigateMock).toHaveBeenCalledOnce()
    expect(navigateMock).toHaveBeenCalledWith("/listings/listing-2")
  })

  it("ignores blank and duplicate listing ids", async () => {
    const user = userEvent.setup()

    renderPage()

    await user.click(screen.getByRole("button", { name: "Open current listing" }))
    await user.click(screen.getByRole("button", { name: "Open blank listing" }))

    expect(navigateMock).not.toHaveBeenCalled()
  })

  it("scrolls to the top when the page loads", () => {
    renderPage()

    expect(scrollToMock).toHaveBeenCalledWith(0, 0)
  })
})
