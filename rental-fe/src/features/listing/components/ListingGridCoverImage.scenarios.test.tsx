import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import {
  LISTING_GRID_COVER_BLUR_TEST_ID,
  LISTING_GRID_COVER_TEST_ID,
  ListingGridCoverImage,
  type ListingGridCoverImageProps,
} from "./ListingGridCoverImage"

const cloudinaryOne =
  "https://res.cloudinary.com/demo/image/upload/v123/listing/one.jpg"
const cloudinaryTwo =
  "https://res.cloudinary.com/demo/image/upload/v123/listing/two.jpg"
const externalOne = "https://example.com/one.jpg"

function renderGridCover(
  props: Partial<ListingGridCoverImageProps> & {
    alt: string
  },
) {
  return render(
    <div className="aspect-square h-40 w-40">
      <ListingGridCoverImage
        src={cloudinaryOne}
        fallbackClassName="text-slate-300"
        {...props}
      />
    </div>,
  )
}

function getFallback(alt: string) {
  return screen.getByRole("img", { name: alt })
}

function getFullImage(alt: string) {
  return screen.getByRole("img", { name: alt })
}

describe("ListingGridCoverImage scenarios", () => {
  afterEach(() => {
    cleanup()
  })

  describe("Pinterest-style blur-up", () => {
    it("shows a blurred LQIP in a stable full-size frame before the cover loads", () => {
      renderGridCover({ alt: "Grid room" })

      const blur = screen.getByTestId(LISTING_GRID_COVER_BLUR_TEST_ID)
      expect(blur).toHaveAttribute("aria-hidden", "true")
      expect(blur.style.backgroundImage).toContain("w_32")
      expect(blur.style.backgroundImage).toContain("e_blur:200")

      const frame = screen.getByTestId(LISTING_GRID_COVER_TEST_ID)
      expect(frame).toHaveClass("relative", "h-full", "w-full", "overflow-hidden")
      expect(getFullImage("Grid room")).toHaveClass("opacity-0")
    })

    it("reveals the sharp cover and removes the blur after load", async () => {
      renderGridCover({ alt: "Grid room" })

      const image = getFullImage("Grid room")
      fireEvent.load(image)

      await waitFor(() => {
        expect(image).toHaveClass("opacity-100")
      })
      expect(
        screen.queryByTestId(LISTING_GRID_COVER_BLUR_TEST_ID),
      ).not.toBeInTheDocument()
    })

    it("never shows a loading spinner for grid covers", () => {
      renderGridCover({ alt: "Grid room" })

      expect(screen.queryByLabelText("Loading photo")).not.toBeInTheDocument()
    })
  })

  describe("light grid delivery", () => {
    it("requests a capped responsive srcset with lazy low-priority loading", () => {
      renderGridCover({ alt: "Grid room" })

      const image = getFullImage("Grid room")
      expect(image).toHaveAttribute("loading", "lazy")
      expect(image).toHaveAttribute("decoding", "async")
      expect(image).toHaveAttribute("fetchpriority", "low")
      expect(image).toHaveAttribute("draggable", "false")
      expect(image.getAttribute("src")).toContain("w_480")
      expect(image.getAttribute("srcset")).toContain("w_240")
    })

    it("loads external sources directly without a blur layer", () => {
      renderGridCover({ alt: "External room", src: externalOne })

      expect(
        screen.queryByTestId(LISTING_GRID_COVER_BLUR_TEST_ID),
      ).not.toBeInTheDocument()
      expect(getFullImage("External room")).toHaveAttribute("src", externalOne)
    })
  })

  describe("missing and invalid sources", () => {
    it.each([
      ["whitespace", "   "],
      ["empty string", ""],
      ["null", null],
      ["undefined", undefined],
    ] as const)("renders the accessible icon fallback for %s sources", (_label, src) => {
      renderGridCover({ alt: "Missing photo", src })

      const fallback = getFallback("Missing photo")
      expect(fallback.tagName).toBe("DIV")
      expect(fallback).toHaveClass("bg-slate-200", "text-slate-300")
      expect(
        screen.queryByTestId(LISTING_GRID_COVER_BLUR_TEST_ID),
      ).not.toBeInTheDocument()
    })
  })

  describe("load failures", () => {
    it("falls back defensively after a broken Cloudinary load", () => {
      renderGridCover({ alt: "Broken Cloudinary photo" })

      fireEvent.error(getFullImage("Broken Cloudinary photo"))

      const fallback = getFallback("Broken Cloudinary photo")
      expect(fallback.tagName).toBe("DIV")
      expect(fallback).toHaveClass("bg-slate-200")
    })

    it("falls back defensively after a broken external load", () => {
      renderGridCover({
        alt: "Broken external photo",
        src: "https://example.com/broken.jpg",
      })

      fireEvent.error(getFullImage("Broken external photo"))

      expect(getFallback("Broken external photo").tagName).toBe("DIV")
    })

    it("keeps the fallback visible after a load error", () => {
      renderGridCover({
        alt: "Broken photo",
        src: externalOne,
      })

      const image = getFullImage("Broken photo")
      expect(image.tagName).toBe("IMG")
      fireEvent.error(image)

      const fallback = getFallback("Broken photo")
      expect(fallback.tagName).toBe("DIV")
      expect(
        screen.queryByTestId(LISTING_GRID_COVER_BLUR_TEST_ID),
      ).not.toBeInTheDocument()
    })
  })

  describe("source changes", () => {
    it("shows blur again when the listing cover source changes mid-load", () => {
      const { rerender } = renderGridCover({ alt: "Grid room", src: cloudinaryOne })

      fireEvent.load(getFullImage("Grid room"))

      rerender(
        <div className="aspect-square h-40 w-40">
          <ListingGridCoverImage
            alt="Grid room"
            src={cloudinaryTwo}
            fallbackClassName="text-slate-300"
          />
        </div>,
      )

      expect(screen.getByTestId(LISTING_GRID_COVER_BLUR_TEST_ID)).toBeInTheDocument()
      expect(getFullImage("Grid room")).toHaveClass("opacity-0")
    })

    it("recovers when the listing cover source changes after a failure", () => {
      const { rerender } = renderGridCover({
        alt: "Grid room",
        src: externalOne,
      })

      fireEvent.error(getFullImage("Grid room"))

      rerender(
        <div className="aspect-square h-40 w-40">
          <ListingGridCoverImage
            alt="Grid room"
            src={cloudinaryTwo}
            fallbackClassName="text-slate-300"
          />
        </div>,
      )

      expect(getFullImage("Grid room").getAttribute("src")).toContain(
        "listing/two.jpg",
      )
      expect(screen.getByTestId(LISTING_GRID_COVER_BLUR_TEST_ID)).toBeInTheDocument()
    })
  })

  describe("presentation", () => {
    it("applies optional image and fallback classes without breaking semantics", () => {
      renderGridCover({
        alt: "Styled room",
        src: externalOne,
        className: "opacity-90",
        fallbackClassName: "text-rose-300",
      })

      expect(getFullImage("Styled room")).toHaveClass("opacity-0", "object-cover")
    })

    it("uses the fallback styling when the styled source fails", () => {
      render(
        <ListingGridCoverImage
          src={externalOne}
          alt="Styled fallback"
          fallbackClassName="text-rose-300"
        />,
      )

      fireEvent.error(getFullImage("Styled fallback"))

      expect(getFallback("Styled fallback")).toHaveClass(
        "bg-slate-200",
        "text-rose-300",
      )
    })

    it("uses a dominant color placeholder instead of blur when provided", () => {
      renderGridCover({
        alt: "Grid room",
        placeholderColor: "rgb(51, 65, 85)",
      })

      expect(screen.getByTestId(LISTING_GRID_COVER_TEST_ID)).toHaveStyle({
        backgroundColor: "rgb(51, 65, 85)",
      })
      expect(
        screen.queryByTestId(LISTING_GRID_COVER_BLUR_TEST_ID),
      ).not.toBeInTheDocument()
    })
  })
})
