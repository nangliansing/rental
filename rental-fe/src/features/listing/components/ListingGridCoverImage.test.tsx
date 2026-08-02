import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  LISTING_GRID_COVER_BLUR_TEST_ID,
  LISTING_GRID_COVER_TEST_ID,
  ListingGridCoverImage,
} from "./ListingGridCoverImage"

describe("ListingGridCoverImage", () => {
  it("shows a blurred LQIP and lazy full image for Cloudinary sources", () => {
    render(
      <ListingGridCoverImage
        src="https://res.cloudinary.com/demo/image/upload/v123/listing/room.jpg"
        alt="Grid room"
      />,
    )

    expect(screen.getByTestId(LISTING_GRID_COVER_TEST_ID)).toHaveClass(
      "relative",
      "h-full",
      "w-full",
      "bg-slate-200",
    )

    const blur = screen.getByTestId(LISTING_GRID_COVER_BLUR_TEST_ID)
    expect(blur).toHaveAttribute("aria-hidden", "true")
    expect(blur).toHaveClass("blur-xl", "scale-110", "bg-cover")
    expect(blur.style.backgroundImage).toContain("w_32")
    expect(blur.style.backgroundImage).toContain("e_blur:200")

    const image = screen.getByRole("img", { name: "Grid room" })
    expect(image).toHaveClass("opacity-0")
    expect(image).toHaveAttribute("loading", "lazy")
    expect(image).toHaveAttribute("decoding", "async")
    expect(image).toHaveAttribute("fetchpriority", "low")
    expect(image.getAttribute("src")).toContain("w_480")
    expect(image.getAttribute("srcset")).toContain("w_240")
    expect(image.getAttribute("sizes")).toBe("(min-width: 640px) 33vw, 50vw")
  })

  it("reveals the sharp cover and removes the blur after load", async () => {
    render(
      <ListingGridCoverImage
        src="https://res.cloudinary.com/demo/image/upload/v123/listing/room.jpg"
        alt="Grid room"
      />,
    )

    const image = screen.getByRole("img", { name: "Grid room" })
    fireEvent.load(image)

    await waitFor(() => {
      expect(image).toHaveClass("opacity-100")
    })
    expect(
      screen.queryByTestId(LISTING_GRID_COVER_BLUR_TEST_ID),
    ).not.toBeInTheDocument()
  })

  it("passes through non-Cloudinary sources without a blur layer", () => {
    render(
      <ListingGridCoverImage
        src="https://example.com/room.jpg"
        alt="External room"
      />,
    )

    expect(
      screen.queryByTestId(LISTING_GRID_COVER_BLUR_TEST_ID),
    ).not.toBeInTheDocument()

    const image = screen.getByRole("img", { name: "External room" })
    expect(image).toHaveAttribute("src", "https://example.com/room.jpg")
    expect(image.getAttribute("srcset")).toBeNull()
  })

  it("uses a dominant color placeholder instead of a blur request", () => {
    render(
      <ListingGridCoverImage
        src="https://res.cloudinary.com/demo/image/upload/v123/listing/room.jpg"
        alt="Grid room"
        placeholderColor="#334155"
      />,
    )

    expect(screen.getByTestId(LISTING_GRID_COVER_TEST_ID)).toHaveStyle({
      backgroundColor: "#334155",
    })
    expect(
      screen.queryByTestId(LISTING_GRID_COVER_BLUR_TEST_ID),
    ).not.toBeInTheDocument()
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
      "opacity-0",
      "object-cover",
    )
  })
})
