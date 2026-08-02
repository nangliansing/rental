import { act, fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LISTING_CARD_GRID_VIRTUALIZATION_THRESHOLD } from "./listingCardGridVirtualization"
import { ListingCardGrid } from "./ListingCardGrid"

let intersectionCallback: IntersectionObserverCallback

class IntersectionObserverMock implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = ""
  readonly scrollMargin = ""
  readonly thresholds = []
  disconnect = vi.fn()
  observe = vi.fn()
  takeRecords = vi.fn(() => [])
  unobserve = vi.fn()

  constructor(callback: IntersectionObserverCallback) {
    intersectionCallback = callback
  }
}

const virtualizedGridSpy = vi.fn(({ testId }: { testId?: string }) => (
  <div data-testid={testId ?? "virtualized-listing-grid"}>virtualized</div>
))

vi.mock("./VirtualizedListingCardGrid", () => ({
  VirtualizedListingCardGrid: (props: { testId?: string }) =>
    virtualizedGridSpy(props),
}))

function createItems(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    _id: `listing-${index}`,
    label: `Listing ${index}`,
  }))
}

describe("ListingCardGrid", () => {
  beforeEach(() => {
    virtualizedGridSpy.mockClear()
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock)
  })

  describe("children API", () => {
    it("uses the shared responsive columns and consistent card gaps", () => {
      render(
        <ListingCardGrid testId="listing-grid">
          <article>First</article>
          <article>Second</article>
        </ListingCardGrid>,
      )

      expect(screen.getByTestId("listing-grid")).toHaveClass(
        "grid",
        "grid-cols-2",
        "gap-0.5",
        "sm:grid-cols-3",
        "md:gap-1",
      )
    })

    it("supports a fixed two-column result layout", () => {
      render(
        <ListingCardGrid columns="two" testId="result-grid">
          <article>First</article>
          <article>Second</article>
        </ListingCardGrid>,
      )

      const grid = screen.getByTestId("result-grid")
      expect(grid).toHaveClass("grid-cols-2", "gap-0.5", "md:gap-1")
      expect(grid).not.toHaveClass("sm:grid-cols-3")
    })
  })

  describe("items API", () => {
    it("renders all items in a static grid below the virtualization threshold", () => {
      render(
        <ListingCardGrid
          testId="static-grid"
          items={createItems(LISTING_CARD_GRID_VIRTUALIZATION_THRESHOLD - 1)}
          getItemKey={(item) => item._id}
          renderItem={(item) => <article>{item.label}</article>}
        />,
      )

      expect(virtualizedGridSpy).not.toHaveBeenCalled()
      expect(screen.getByTestId("static-grid")).toHaveClass("grid")
      expect(screen.getByText("Listing 0")).toBeInTheDocument()
      expect(screen.getByText("Listing 22")).toBeInTheDocument()
    })

    it("switches to the virtualized renderer once the threshold is reached", () => {
      render(
        <ListingCardGrid
          testId="listing-grid"
          items={createItems(LISTING_CARD_GRID_VIRTUALIZATION_THRESHOLD)}
          getItemKey={(item) => item._id}
          renderItem={(item) => <article>{item.label}</article>}
        />,
      )

      expect(virtualizedGridSpy).toHaveBeenCalledOnce()
      expect(screen.getByTestId("listing-grid")).toHaveTextContent("virtualized")
      expect(screen.queryByTestId("static-grid")).not.toBeInTheDocument()
    })

    it("respects a custom virtualizeFrom override", () => {
      render(
        <ListingCardGrid
          virtualizeFrom={3}
          items={createItems(3)}
          getItemKey={(item) => item._id}
          renderItem={(item) => <article>{item.label}</article>}
        />,
      )

      expect(virtualizedGridSpy).toHaveBeenCalledOnce()
    })
  })

  describe("pagination", () => {
    it("supports manual and automatic infinite fetching without duplicate observer requests", () => {
      const onFetchNextPage = vi.fn()
      render(
        <ListingCardGrid
          hasNextPage
          isFetchingNextPage={false}
          onFetchNextPage={onFetchNextPage}
        >
          <article>Listing</article>
        </ListingCardGrid>,
      )

      fireEvent.click(screen.getByRole("button", { name: "Load more" }))
      expect(onFetchNextPage).toHaveBeenCalledOnce()

      act(() => {
        const entry = { isIntersecting: true } as IntersectionObserverEntry
        intersectionCallback([entry], {} as IntersectionObserver)
        intersectionCallback([entry], {} as IntersectionObserver)
      })

      expect(onFetchNextPage).toHaveBeenCalledOnce()
    })

    it("renders the collection-specific end message", () => {
      render(
        <ListingCardGrid
          hasNextPage={false}
          onFetchNextPage={vi.fn()}
          endMessage="No more saved rooms"
        >
          <article>Listing</article>
        </ListingCardGrid>,
      )

      expect(screen.getByText("No more saved rooms")).toBeInTheDocument()
    })

    it("keeps cards visible and offers retry after a pagination error", () => {
      const onFetchNextPage = vi.fn()
      render(
        <ListingCardGrid
          hasNextPage
          isFetchNextPageError
          onFetchNextPage={onFetchNextPage}
          loadMoreErrorMessage="Could not load more saved rooms."
          items={createItems(2)}
          getItemKey={(item) => item._id}
          renderItem={(item) => <article>{item.label}</article>}
        />,
      )

      expect(screen.getByText("Listing 0")).toBeInTheDocument()
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Could not load more saved rooms.",
      )
      fireEvent.click(screen.getByRole("button", { name: "Try again" }))
      expect(onFetchNextPage).toHaveBeenCalledOnce()
    })
  })
})
