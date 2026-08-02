import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ListingGridCoverImage } from "./ListingGridCoverImage"

describe("ListingGridCoverImage", () => {
  it("renders a blurred placeholder and lazy full image for Cloudinary sources", () => {
    render(
      <ListingGridCoverImage
        src="https://res.cloudinary.com/demo/image/upload/v123/listing/room.jpg"
        alt="Grid room"
      />,
    )

    expect(screen.getByTestId("progressive-cover-placeholder")).toHaveAttribute(
      "src",
      expect.stringContaining("e_blur:200"),
    )

    const image = screen.getByRole("img", { name: "Grid room" })
    expect(image).toHaveAttribute("loading", "lazy")
    expect(image).toHaveAttribute("decoding", "async")
    expect(image).toHaveAttribute("fetchpriority", "low")
    expect(image.getAttribute("src")).toContain("w_640")
  })

  it("passes through non-Cloudinary sources without a blur placeholder", () => {
    render(
      <ListingGridCoverImage
        src="https://example.com/room.jpg"
        alt="External room"
      />,
    )

    expect(
      screen.queryByTestId("progressive-cover-placeholder"),
    ).not.toBeInTheDocument()
    expect(screen.getByRole("img", { name: "External room" })).toHaveAttribute(
      "src",
      "https://example.com/room.jpg",
    )
  })

  it("trims whitespace-only sources and renders the accessible fallback", () => {
    render(<ListingGridCoverImage src="   " alt="Missing photo" />)

    expect(screen.getByRole("img", { name: "Missing photo" }).tagName).toBe(
      "DIV",
    )
  })

  it("treats null and undefined sources as missing photos", () => {
    const { rerender } = render(
      <ListingGridCoverImage src={null} alt="Missing photo" />,
    )

    expect(screen.getByRole("img", { name: "Missing photo" }).tagName).toBe(
      "DIV",
    )

    rerender(<ListingGridCoverImage src={undefined} alt="Missing photo" />)
    expect(screen.getByRole("img", { name: "Missing photo" }).tagName).toBe(
      "DIV",
    )
  })

  it("falls back after a broken image load and stays on the fallback", () => {
    render(
      <ListingGridCoverImage
        src="https://example.com/broken.jpg"
        alt="Broken photo"
      />,
    )

    fireEvent.error(screen.getByRole("img", { name: "Broken photo" }))
    expect(screen.getByRole("img", { name: "Broken photo" }).tagName).toBe(
      "DIV",
    )
  })

  it("applies optional presentation classes without changing semantics", () => {
    render(
      <ListingGridCoverImage
        src="https://example.com/room.jpg"
        alt="Styled room"
        className="opacity-90"
        fallbackClassName="text-rose-300"
      />,
    )

    expect(screen.getByRole("img", { name: "Styled room" })).toHaveClass(
      "opacity-90",
      "object-cover",
    )
  })
})
