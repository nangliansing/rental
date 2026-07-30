import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import {
  createSearchBuilding,
  createSearchListing,
} from "@/test/fixtures/listings"

import { LISTING_GRID_AVAILABLE_NOW_INDICATOR_CLASS_NAME } from "./grid-preview"
import { ListingGridCard } from "./ListingGridCard"

describe("ListingGridCard", () => {
  it("renders a defensive, accessible link card with shared presentation", () => {
    const listing = {
      ...createSearchListing({ visibility: "PRIVATE" }),
      building: createSearchBuilding(),
    }

    const { container } = render(
      <MemoryRouter>
        <ListingGridCard listing={listing} />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole("link", { name: "Open listing ฿14k" }),
    ).toHaveAttribute("href", "/listings/listing-1")
    expect(
      screen.getByRole("img", { name: "Bright rental room" }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Private listing")).toBeInTheDocument()
    expect(screen.getByText("Bangkapi Residence")).toBeInTheDocument()
    expect(screen.getByText("1 bed · 36 sqm")).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass("aspect-square")
    expect(container.firstElementChild).not.toHaveClass("rounded-lg")
    expect(
      container.querySelector('[data-slot="listing-grid-card-price"]'),
    ).toHaveClass("text-sm", "font-semibold")
    expect(
      container.querySelector('[data-slot="listing-grid-card-title"]'),
    ).toHaveClass("text-xs", "text-white/90")
  })

  it("uses safe fallbacks and opens through the supplied callback", async () => {
    const user = userEvent.setup()
    const onActivate = vi.fn()
    const listing = createSearchListing({
      rent: Number.POSITIVE_INFINITY,
      bedroomCount: -1,
      size: Number.NaN,
      media: [null, { secureUrl: " " }] as never,
    })

    render(<ListingGridCard listing={listing} onActivate={onActivate} />)

    const button = screen.getByRole("button", {
      name: "Open listing ฿--",
    })
    expect(screen.getByRole("img", { name: "Listing photo" }).tagName).toBe(
      "DIV",
    )
    expect(screen.getByText("Room")).toBeInTheDocument()
    expect(screen.queryByText(/^Dep /)).not.toBeInTheDocument()

    await user.click(button)

    expect(onActivate).toHaveBeenCalledOnce()
    expect(onActivate).toHaveBeenCalledWith(listing, button)
  })

  it("omits a whitespace-only building name", () => {
    const listing = {
      ...createSearchListing(),
      building: createSearchBuilding({ name: "   " }),
    }

    render(
      <MemoryRouter>
        <ListingGridCard listing={listing} />
      </MemoryRouter>,
    )

    expect(screen.queryByText("Bangkapi Residence")).not.toBeInTheDocument()
  })

  it("shows a green availability dot when the listing is available now", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

    const listing = createSearchListing({
      availableAt: "2026-07-29T00:00:00+07:00",
    })

    render(
      <MemoryRouter>
        <ListingGridCard listing={listing} />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText("Available now")).toHaveClass(
      LISTING_GRID_AVAILABLE_NOW_INDICATOR_CLASS_NAME,
    )

    vi.useRealTimers()
  })

  it("omits the availability dot for flexible listings", () => {
    render(
      <MemoryRouter>
        <ListingGridCard listing={createSearchListing({ availableAt: null })} />
      </MemoryRouter>,
    )

    expect(screen.queryByLabelText("Available now")).not.toBeInTheDocument()
  })

  it("omits the availability dot for a future availability date", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

    render(
      <MemoryRouter>
        <ListingGridCard
          listing={createSearchListing({
            availableAt: "2026-08-15T00:00:00+07:00",
          })}
        />
      </MemoryRouter>,
    )

    expect(screen.queryByLabelText("Available now")).not.toBeInTheDocument()

    vi.useRealTimers()
  })

  it("shows fine print only in full overlay density", () => {
    const listing = createSearchListing({ availableAt: null })

    const { rerender } = render(
      <MemoryRouter>
        <ListingGridCard listing={listing} overlayDensity="compact" />
      </MemoryRouter>,
    )

    expect(screen.queryByText(/^Dep /)).not.toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <ListingGridCard listing={listing} overlayDensity="full" />
      </MemoryRouter>,
    )

    expect(screen.getByText(/^Dep /)).toBeInTheDocument()
    expect(screen.getByText("Flexible")).toBeInTheDocument()
  })
})
