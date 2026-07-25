import { act, fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

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

describe("ListingCardGrid", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock)
  })

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
      >
        <article>Existing listing</article>
      </ListingCardGrid>,
    )

    expect(screen.getByText("Existing listing")).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not load more saved rooms.",
    )
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(onFetchNextPage).toHaveBeenCalledOnce()
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
