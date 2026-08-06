import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
  LISTING_LOCATION_SECTION_TITLE,
  ListingLocationSection,
} from "./ListingLocationSection"

vi.mock("@/shared/google-maps/readonly-map", () => ({
  ReadOnlyMap: ({
    mapInstanceId,
    navigable,
  }: {
    mapInstanceId?: string
    navigable?: boolean
  }) => (
    <div
      data-testid="readonly-map"
      data-map-instance-id={mapInstanceId}
      data-navigable={String(navigable)}
    />
  ),
}))

const pointGeo = {
  kind: "point" as const,
  position: { lat: 13.7654, lng: 100.6435 },
}

describe("ListingLocationSection", () => {
  it("renders nothing without geo", () => {
    const { container } = render(<ListingLocationSection geo={null} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("starts collapsed and mounts the locked map on expand", () => {
    render(
      <ListingLocationSection
        geo={pointGeo}
        mapInstanceId="listing-location-test"
      />,
    )

    const toggle = screen.getByRole("button", {
      name: LISTING_LOCATION_SECTION_TITLE,
    })

    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByTestId("readonly-map")).not.toBeInTheDocument()

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute("aria-expanded", "true")
    const map = screen.getByTestId("readonly-map")
    expect(map).toHaveAttribute("data-map-instance-id", "listing-location-test")
    expect(map).toHaveAttribute("data-navigable", "false")
  })

  it("can start open when requested", () => {
    render(<ListingLocationSection geo={pointGeo} defaultOpen />)

    expect(
      screen.getByRole("button", { name: LISTING_LOCATION_SECTION_TITLE }),
    ).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByTestId("readonly-map")).toBeInTheDocument()
  })
})
