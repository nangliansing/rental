import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import {
  createSearchBuilding,
  createSearchListing,
} from "@/test/fixtures/listings"

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
    const onOpen = vi.fn()
    const listing = createSearchListing({
      rent: Number.POSITIVE_INFINITY,
      bedroomCount: -1,
      size: Number.NaN,
      media: [null, { secureUrl: " " }] as never,
    })

    render(<ListingGridCard listing={listing} onOpen={onOpen} />)

    const button = screen.getByRole("button", {
      name: "Open listing ฿--",
    })
    expect(screen.getByRole("img", { name: "Listing photo" }).tagName).toBe(
      "DIV",
    )
    expect(screen.getByText("Room")).toBeInTheDocument()

    await user.click(button)

    expect(onOpen).toHaveBeenCalledOnce()
    expect(onOpen).toHaveBeenCalledWith("listing-1", button)
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
})
