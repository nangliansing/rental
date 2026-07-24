import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { createSearchListing } from "@/test/fixtures/listings"

import { BuildingListingPreview } from "./BuildingListingPreview"

describe("BuildingListingPreview", () => {
  it("uses shared listing presentation for normal data", () => {
    render(<BuildingListingPreview listing={createSearchListing()} />)

    expect(
      screen.getByRole("img", { name: "Room preview" }),
    ).toBeInTheDocument()
    expect(screen.getByText("฿14k")).toBeInTheDocument()
    expect(screen.getByLabelText("1 bed")).toHaveTextContent("1")
  })

  it("renders safe fallbacks when media and numeric data are invalid", () => {
    render(
      <BuildingListingPreview
        listing={createSearchListing({
          media: [],
          rent: Number.POSITIVE_INFINITY,
          bedroomCount: -1,
        })}
      />,
    )

    expect(screen.getByText("No photo")).toBeInTheDocument()
    expect(screen.getByText("฿--")).toBeInTheDocument()
    expect(screen.getByLabelText("Room")).toHaveTextContent("Room")
  })
})
