import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  LISTING_FACILITIES_SECTION_TITLE,
  ListingFacilitiesSection,
} from "./ListingFacilitiesSection"

describe("ListingFacilitiesSection", () => {
  it("renders nothing when there are no usable facilities", () => {
    const { container } = render(
      <ListingFacilitiesSection facilities={[null, " ", 7] as never} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("starts collapsed and reveals facility tiles on expand", () => {
    render(<ListingFacilitiesSection facilities={["Wifi", "Balcony"]} />)

    const toggle = screen.getByRole("button", {
      name: LISTING_FACILITIES_SECTION_TITLE,
    })

    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText("Wi-Fi")).not.toBeInTheDocument()
    expect(screen.queryByText("Balcony")).not.toBeInTheDocument()

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("Wi-Fi")).toBeInTheDocument()
    expect(screen.getByText("Balcony")).toBeInTheDocument()
  })

  it("can start open when requested", () => {
    render(
      <ListingFacilitiesSection
        facilities={["TV"]}
        defaultOpen
      />,
    )

    expect(
      screen.getByRole("button", { name: LISTING_FACILITIES_SECTION_TITLE }),
    ).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("TV")).toBeInTheDocument()
  })
})
