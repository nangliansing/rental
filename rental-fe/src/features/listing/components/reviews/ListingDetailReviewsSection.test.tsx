import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  createListingAgentProfile,
  createSearchBuilding,
  createSearchListing,
} from "@/test/fixtures/listings"
import { renderWithProviders } from "@/test/renderWithProviders"

import {
  EMPTY_LISTER_REVIEW_TEASER_COPY,
  HIDDEN_LISTER_REVIEW_TEASER_COPY,
} from "./ReviewTeaserEmptyPrompt"
import { ListingDetailReviewsSection } from "./ListingDetailReviewsSection"

const mocks = vi.hoisted(() => ({
  searchListerReviews: vi.fn(),
}))

vi.mock("@/features/lister-review/api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/lister-review/api")>()
  return {
    ...actual,
    searchListerReviews: mocks.searchListerReviews,
  }
})

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { _id: "viewer-1", name: "Viewer Name" },
    userId: "viewer-1",
    isAuthenticated: true,
    isLoading: false,
    isFetching: false,
    isUnauthorized: false,
    refetchUser: vi.fn(),
  }),
}))

vi.mock("../ListerReviewsDialog", () => ({
  ListerReviewsDialog: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean
    onClose: () => void
  }) =>
    isOpen ? (
      <div role="dialog" aria-label="Lister reviews dialog">
        <button type="button" onClick={onClose}>
          Close lister reviews
        </button>
      </div>
    ) : null,
}))

let observerCallback: IntersectionObserverCallback | null = null
const observe = vi.fn()
const disconnect = vi.fn()

class IntersectionObserverMock implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = ""
  readonly thresholds = []

  constructor(callback: IntersectionObserverCallback) {
    observerCallback = callback
  }

  observe = observe
  unobserve = vi.fn()
  disconnect = disconnect
  takeRecords = vi.fn(() => [])
}

function setSectionInView(isIntersecting: boolean) {
  act(() => {
    observerCallback?.(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    )
  })
}

function createReview(overrides: {
  _id: string
  comment: string | null
  displayName?: string | null
}) {
  return {
    _id: overrides._id,
    reviewerId: "user-1",
    listerProfileId: "agent-1",
    relatedListingId: null,
    relatedBuildingId: null,
    rating: 5,
    tags: [],
    comment: overrides.comment,
    interaction: {
      isVerified: true,
      verifiedBy: "CONTACT_CLICK" as const,
      contactEventId: "event-1",
      verifiedAt: "now",
    },
    moderation: {
      hiddenBy: null,
      hiddenAt: null,
      hiddenReason: null,
      removedBy: null,
      removedAt: null,
      removedReason: null,
    },
    visibility: {
      isCollapsed: false,
      collapsedBy: null,
      collapsedAt: null,
      collapseReason: null,
    },
    editedAt: null,
    isDeleted: false,
    deletedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    reviewer: {
      userId: "user-1",
      name: "Full Name",
      displayName: overrides.displayName ?? "Alex Rivera",
      profilePhoto: null,
      isVerified: true,
    },
  }
}

describe("ListingDetailReviewsSection", () => {
  beforeEach(() => {
    mocks.searchListerReviews.mockReset()
    observerCallback = null
    observe.mockClear()
    disconnect.mockClear()
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("skips fetching and shows a placeholder when reviewCount is 0", () => {
    renderWithProviders(
      <ListingDetailReviewsSection
        listing={createSearchListing({
          building: createSearchBuilding(),
          agentProfile: createListingAgentProfile({
            reviewSummary: {
              averageRating: 0,
              reviewCount: 0,
              ratingCounts: {
                oneStar: 0,
                twoStars: 0,
                threeStars: 0,
                fourStars: 0,
                fiveStars: 0,
              },
              tagCounts: [],
            },
          }),
        })}
      />,
    )

    setSectionInView(true)
    expect(screen.getByLabelText("No lister reviews yet")).toBeInTheDocument()
    expect(
      screen.getByText(EMPTY_LISTER_REVIEW_TEASER_COPY),
    ).toBeInTheDocument()
    expect(mocks.searchListerReviews).not.toHaveBeenCalled()
  })

  it("shows the top two review tags between the header and teaser", async () => {
    mocks.searchListerReviews.mockResolvedValue({
      success: true,
      data: {
        myReview: null,
        reviews: [
          createReview({
            _id: "r1",
            comment: "Super responsive.",
            displayName: "Alex",
          }),
        ],
      },
      pagination: { page: 1, limit: 3, total: 1 },
    })

    renderWithProviders(
      <ListingDetailReviewsSection
        listing={createSearchListing({
          building: createSearchBuilding(),
          agentProfile: createListingAgentProfile({
            reviewSummary: {
              averageRating: 4.8,
              reviewCount: 12,
              ratingCounts: {
                oneStar: 0,
                twoStars: 0,
                threeStars: 0,
                fourStars: 2,
                fiveStars: 10,
              },
              tagCounts: [
                { tag: "FRIENDLY", count: 2 },
                { tag: "HELPFUL", count: 8 },
                { tag: "RESPONSIVE", count: 5 },
              ],
            },
          }),
        })}
      />,
    )

    expect(screen.getByLabelText("Top review tags")).toBeInTheDocument()
    expect(screen.getByText("Helpful")).toBeInTheDocument()
    expect(screen.getByText("8")).toBeInTheDocument()
    expect(screen.getByText("Responsive")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.queryByText("Friendly")).not.toBeInTheDocument()

    setSectionInView(true)
    expect(await screen.findByText("Super responsive.")).toBeInTheDocument()
  })

  it("loads latest teasers when the section enters view", async () => {
    mocks.searchListerReviews.mockResolvedValue({
      success: true,
      data: {
        myReview: null,
        reviews: [
          createReview({
            _id: "r1",
            comment: "Super responsive and easy to schedule a viewing.",
            displayName: "Alex Rivera",
          }),
          createReview({
            _id: "r2",
            comment: "Clear answers about deposit.",
            displayName: "Mina Chen",
          }),
        ],
      },
      pagination: { page: 1, limit: 3, total: 2 },
    })

    renderWithProviders(
      <ListingDetailReviewsSection
        listing={createSearchListing({
          building: createSearchBuilding(),
          agentProfile: createListingAgentProfile({
            reviewSummary: {
              averageRating: 4.5,
              reviewCount: 30,
              ratingCounts: {
                oneStar: 0,
                twoStars: 0,
                threeStars: 0,
                fourStars: 15,
                fiveStars: 15,
              },
              tagCounts: [],
            },
          }),
        })}
      />,
    )

    expect(screen.getByText("4.5 (30 reviews)")).toBeInTheDocument()
    expect(mocks.searchListerReviews).not.toHaveBeenCalled()

    setSectionInView(true)

    expect(
      await screen.findByLabelText("Loading lister reviews"),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(mocks.searchListerReviews).toHaveBeenCalledWith(
        expect.objectContaining({
          listerProfileId: "agent-1",
          page: 1,
          limit: 3,
          sort: "latest",
        }),
      )
    })

    expect(
      await screen.findByLabelText("Lister review teasers"),
    ).toBeInTheDocument()
    const teaserText = screen.getByText(
      "Super responsive and easy to schedule a viewing.",
    )
    expect(teaserText).toBeInTheDocument()
    // Long comments must clip inside the card instead of widening the page.
    expect(teaserText).toHaveClass("truncate")
    expect(teaserText.parentElement).toHaveClass("min-w-0")
    expect(screen.queryByText("Alex Rivera")).not.toBeInTheDocument()
  })

  it("shows an error placeholder when the request fails", async () => {
    mocks.searchListerReviews.mockRejectedValue(new Error("network"))

    renderWithProviders(
      <ListingDetailReviewsSection
        listing={createSearchListing({
          building: createSearchBuilding(),
          agentProfile: createListingAgentProfile({
            reviewSummary: {
              averageRating: 4,
              reviewCount: 2,
              ratingCounts: {
                oneStar: 0,
                twoStars: 0,
                threeStars: 0,
                fourStars: 2,
                fiveStars: 0,
              },
              tagCounts: [],
            },
          }),
        })}
      />,
    )

    setSectionInView(true)

    expect(
      await screen.findByLabelText("Lister reviews unavailable"),
    ).toBeInTheDocument()
    expect(screen.getByText("Could not load reviews")).toBeInTheDocument()
  })

  it("shows a rating line when the only review has no comment", async () => {
    mocks.searchListerReviews.mockResolvedValue({
      success: true,
      data: {
        myReview: null,
        reviews: [createReview({ _id: "r1", comment: null })],
      },
      pagination: { page: 1, limit: 3, total: 1 },
    })

    renderWithProviders(
      <ListingDetailReviewsSection
        listing={createSearchListing({
          building: createSearchBuilding(),
          agentProfile: createListingAgentProfile({
            reviewSummary: {
              averageRating: 5,
              reviewCount: 1,
              ratingCounts: {
                oneStar: 0,
                twoStars: 0,
                threeStars: 0,
                fourStars: 0,
                fiveStars: 1,
              },
              tagCounts: [],
            },
          }),
        })}
      />,
    )

    setSectionInView(true)

    expect(await screen.findByText("Rated 5 out of 5")).toBeInTheDocument()
    expect(
      screen.queryByText(EMPTY_LISTER_REVIEW_TEASER_COPY),
    ).not.toBeInTheDocument()
  })

  it("includes the viewer's own review, which the API returns separately", async () => {
    mocks.searchListerReviews.mockResolvedValue({
      success: true,
      data: {
        myReview: createReview({
          _id: "mine",
          comment: "I rented through this lister.",
          displayName: "Nang",
        }),
        reviews: [],
      },
      pagination: { page: 1, limit: 3, total: 0 },
    })

    renderWithProviders(
      <ListingDetailReviewsSection
        listing={createSearchListing({
          building: createSearchBuilding(),
          agentProfile: createListingAgentProfile({
            reviewSummary: {
              averageRating: 5,
              reviewCount: 1,
              ratingCounts: {
                oneStar: 0,
                twoStars: 0,
                threeStars: 0,
                fourStars: 0,
                fiveStars: 1,
              },
              tagCounts: [],
            },
          }),
        })}
      />,
    )

    setSectionInView(true)

    expect(
      await screen.findByText("I rented through this lister."),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(EMPTY_LISTER_REVIEW_TEASER_COPY),
    ).not.toBeInTheDocument()
  })

  it("shows See all reviews when the summary counts reviews but none are usable", async () => {
    mocks.searchListerReviews.mockResolvedValue({
      success: true,
      data: { myReview: null, reviews: [] },
      pagination: { page: 1, limit: 3, total: 0 },
    })

    renderWithProviders(
      <ListingDetailReviewsSection
        listing={createSearchListing({
          building: createSearchBuilding(),
          agentProfile: createListingAgentProfile({
            reviewSummary: {
              averageRating: 5,
              reviewCount: 2,
              ratingCounts: {
                oneStar: 0,
                twoStars: 0,
                threeStars: 0,
                fourStars: 0,
                fiveStars: 2,
              },
              tagCounts: [],
            },
          }),
        })}
      />,
    )

    setSectionInView(true)

    expect(
      await screen.findByText(HIDDEN_LISTER_REVIEW_TEASER_COPY),
    ).toBeInTheDocument()
  })

  it("shows See all reviews when reviews exist but none are returned", async () => {
    mocks.searchListerReviews.mockResolvedValue({
      success: true,
      data: { myReview: null, reviews: [] },
      pagination: { page: 1, limit: 3, total: 1 },
    })

    renderWithProviders(
      <ListingDetailReviewsSection
        listing={createSearchListing({
          building: createSearchBuilding(),
          agentProfile: createListingAgentProfile({
            reviewSummary: {
              averageRating: 5,
              reviewCount: 1,
              ratingCounts: {
                oneStar: 0,
                twoStars: 0,
                threeStars: 0,
                fourStars: 0,
                fiveStars: 1,
              },
              tagCounts: [],
            },
          }),
        })}
      />,
    )

    setSectionInView(true)

    expect(
      await screen.findByText(HIDDEN_LISTER_REVIEW_TEASER_COPY),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(EMPTY_LISTER_REVIEW_TEASER_COPY),
    ).not.toBeInTheDocument()
  })

  it("keeps the listing reviews page muted and coming soon", () => {
    renderWithProviders(
      <ListingDetailReviewsSection
        listing={createSearchListing({
          building: createSearchBuilding(),
          agentProfile: createListingAgentProfile({
            reviewSummary: {
              averageRating: 0,
              reviewCount: 0,
              ratingCounts: {
                oneStar: 0,
                twoStars: 0,
                threeStars: 0,
                fourStars: 0,
                fiveStars: 0,
              },
              tagCounts: [],
            },
          }),
        })}
      />,
    )

    const scroller = screen.getByLabelText("Card pages")
    Object.defineProperty(scroller, "clientWidth", {
      configurable: true,
      value: 320,
    })
    scroller.scrollLeft = 320
    fireEvent.scroll(scroller)

    expect(screen.getByText("Listing reviews")).toBeInTheDocument()
    expect(screen.getByText("Coming soon")).toBeInTheDocument()
    expect(screen.getByText("Coming in the future")).toBeInTheDocument()
  })

  it("opens the lister reviews dialog when the lister page is clicked", () => {
    renderWithProviders(
      <ListingDetailReviewsSection
        listing={createSearchListing({
          building: createSearchBuilding(),
          agentProfile: createListingAgentProfile({
            reviewSummary: {
              averageRating: 4.5,
              reviewCount: 2,
              ratingCounts: {
                oneStar: 0,
                twoStars: 0,
                threeStars: 0,
                fourStars: 1,
                fiveStars: 1,
              },
              tagCounts: [],
            },
          }),
        })}
      />,
    )

    const card = screen.getByRole("region", { name: "Review highlights" })
    expect(card).toHaveClass("cursor-pointer")
    expect(
      screen.queryByRole("dialog", { name: "Lister reviews dialog" }),
    ).not.toBeInTheDocument()

    fireEvent.pointerDown(card, { button: 0, clientX: 10, clientY: 10 })
    fireEvent.pointerUp(card, { button: 0, clientX: 10, clientY: 10 })
    fireEvent.click(card)

    expect(
      screen.getByRole("dialog", { name: "Lister reviews dialog" }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Close lister reviews" }))
    expect(
      screen.queryByRole("dialog", { name: "Lister reviews dialog" }),
    ).not.toBeInTheDocument()
  })

  it("does not open the dialog when the listing reviews page is active", () => {
    renderWithProviders(
      <ListingDetailReviewsSection
        listing={createSearchListing({
          building: createSearchBuilding(),
          agentProfile: createListingAgentProfile({
            reviewSummary: {
              averageRating: 4.5,
              reviewCount: 2,
              ratingCounts: {
                oneStar: 0,
                twoStars: 0,
                threeStars: 0,
                fourStars: 1,
                fiveStars: 1,
              },
              tagCounts: [],
            },
          }),
        })}
      />,
    )

    const card = screen.getByRole("region", { name: "Review highlights" })
    const scroller = screen.getByLabelText("Card pages")
    Object.defineProperty(scroller, "clientWidth", {
      configurable: true,
      value: 320,
    })
    scroller.scrollLeft = 320
    fireEvent.scroll(scroller)

    expect(screen.getByText("Listing reviews")).toBeInTheDocument()
    expect(card).toHaveAttribute("aria-disabled", "true")
    expect(card).not.toHaveClass("cursor-pointer")

    fireEvent.click(card)
    expect(
      screen.queryByRole("dialog", { name: "Lister reviews dialog" }),
    ).not.toBeInTheDocument()
  })
})
