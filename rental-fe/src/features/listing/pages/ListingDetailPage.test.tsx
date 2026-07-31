import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { StandalonePageBackProvider } from "@/shared/components/navigation/StandalonePageBackContext"
import { StandalonePageHeader } from "@/shared/components/navigation/StandalonePageHeader"
import { createSearchListing } from "@/test/fixtures/listings"

import { ListingDetailPage } from "./ListingDetailPage"

const navigateMock = vi.fn()
const scrollToMock = vi.fn()
const standaloneBackMock = vi.fn()

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
  useNavigateBack: () => standaloneBackMock,
}))

vi.mock("../hooks/useListingDetailData", () => ({
  useListingDetailData: vi.fn(),
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

import { useListingDetailData } from "../hooks/useListingDetailData"

function renderPage(
  initialEntry:
    | string
    | {
        pathname: string
        state?: { returnTo?: string }
      } = "/listings/listing-1",
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <StandalonePageBackProvider>
        <StandalonePageHeader />
        <Routes>
          <Route path="/listings/:listingId" element={<ListingDetailPage />} />
          <Route path="/buildings/:buildingId" element={<div>Building page</div>} />
        </Routes>
      </StandalonePageBackProvider>
    </MemoryRouter>,
  )
}

describe("ListingDetailPage", () => {
  beforeEach(() => {
    navigateMock.mockReset()
    scrollToMock.mockReset()
    standaloneBackMock.mockReset()
    window.scrollTo = scrollToMock

    vi.mocked(useListingDetailData).mockReturnValue({
      listing: createSearchListing({ _id: "listing-1" }),
      isLoading: false,
      viewerUserId: undefined,
    } as never)
  })

  it("registers the standalone header back handler", async () => {
    const user = userEvent.setup()

    renderPage({
      pathname: "/listings/listing-1",
      state: { returnTo: "/buildings/building-1" },
    })

    await user.click(screen.getByRole("button", { name: "Go back" }))

    expect(standaloneBackMock).toHaveBeenCalledOnce()
  })

  it("navigates to another listing from the detail content callback", async () => {
    const user = userEvent.setup()

    renderPage()

    await user.click(screen.getByRole("button", { name: "Open sibling listing" }))

    expect(navigateMock).toHaveBeenCalledOnce()
    expect(navigateMock).toHaveBeenCalledWith("/listings/listing-2")
  })

  it("navigates to another listing without router state", async () => {
    const user = userEvent.setup()

    renderPage({
      pathname: "/listings/listing-1",
      state: { returnTo: "/buildings/building-1" },
    })

    await user.click(screen.getByRole("button", { name: "Open sibling listing" }))

    expect(navigateMock).toHaveBeenCalledWith("/listings/listing-2")
  })

  it("ignores blank and duplicate listing ids", async () => {
    const user = userEvent.setup()

    renderPage()

    await user.click(screen.getByRole("button", { name: "Open current listing" }))
    await user.click(screen.getByRole("button", { name: "Open blank listing" }))

    expect(navigateMock).not.toHaveBeenCalled()
  })

  it("shows a loading state while listing data is pending", () => {
    vi.mocked(useListingDetailData).mockReturnValue({
      listing: null,
      isLoading: true,
      viewerUserId: undefined,
    } as never)

    renderPage()

    expect(screen.getByText("Loading listing...")).toBeInTheDocument()
  })

  it("shows a not-found state when listing data is missing", () => {
    vi.mocked(useListingDetailData).mockReturnValue({
      listing: null,
      isLoading: false,
      viewerUserId: undefined,
    } as never)

    renderPage()

    expect(
      screen.getByRole("heading", { name: "Listing not found" }),
    ).toBeInTheDocument()
  })

  it("scrolls to the top when the page loads", () => {
    renderPage()

    expect(scrollToMock).toHaveBeenCalledWith(0, 0)
  })
})
