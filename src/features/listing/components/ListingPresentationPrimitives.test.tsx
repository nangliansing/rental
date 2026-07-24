import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  ListingCoverImage,
  ListingPrice,
  ListingRoomSummary,
} from "./ListingPresentationPrimitives"

describe("ListingCoverImage", () => {
  it("normalizes image data and derives an accessible fallback alt", () => {
    render(
      <ListingCoverImage
        photo={{ secureUrl: " https://example.com/room.jpg ", alt: " " }}
        altFallback=" Room preview "
      />,
    )

    expect(screen.getByRole("img", { name: "Room preview" })).toHaveAttribute(
      "src",
      "https://example.com/room.jpg",
    )
  })

  it("shows the fallback for missing and failed images", () => {
    const { rerender } = render(
      <ListingCoverImage photo={null} fallbackLabel=" No photo " />,
    )

    expect(screen.getByRole("img", { name: "Listing photo" }).tagName).toBe(
      "DIV",
    )
    expect(screen.getByText("No photo")).toBeInTheDocument()

    rerender(
      <ListingCoverImage
        photo={{ secureUrl: "https://example.com/broken.jpg" }}
        fallbackLabel="No photo"
      />,
    )
    fireEvent.error(screen.getByRole("img", { name: "Listing photo" }))

    expect(screen.getByRole("img", { name: "Listing photo" }).tagName).toBe(
      "DIV",
    )
    expect(screen.getByText("No photo")).toBeInTheDocument()
  })
})

describe("ListingPrice", () => {
  it("supports compact and full money presentation", () => {
    render(
      <>
        <ListingPrice value={14500} />
        <ListingPrice value={14500} compact={false} />
      </>,
    )

    expect(screen.getByText("฿14.5k")).toBeInTheDocument()
    expect(screen.getByText("฿14,500")).toBeInTheDocument()
  })

  it.each([undefined, null, Number.NaN, Number.POSITIVE_INFINITY, -1])(
    "uses a safe placeholder for invalid value %s",
    (value) => {
      render(<ListingPrice value={value} />)

      expect(screen.getByText("฿--")).toBeInTheDocument()
    },
  )
})

describe("ListingRoomSummary", () => {
  it("formats bedrooms and positive finite size values", () => {
    render(<ListingRoomSummary bedroomCount={0} size={1234} />)

    expect(screen.getByText("Studio · 1,234 sqm")).toBeInTheDocument()
  })

  it("omits invalid size and safely handles an invalid bedroom count", () => {
    render(
      <ListingRoomSummary
        bedroomCount={Number.POSITIVE_INFINITY}
        size={-10}
      />,
    )

    expect(screen.getByText("Room")).toBeInTheDocument()
    expect(screen.queryByText(/sqm/)).not.toBeInTheDocument()
  })

  it("rejects fractional bedroom counts", () => {
    render(<ListingRoomSummary bedroomCount={1.5} size={36} />)

    expect(screen.getByText("Room · 36 sqm")).toBeInTheDocument()
  })
})
