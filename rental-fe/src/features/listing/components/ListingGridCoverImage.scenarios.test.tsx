import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { resolveCoverImageDelivery } from "@/shared/components/media/gallery-image-delivery"
import { resetProgressiveGalleryCacheForTests } from "@/shared/components/media/ProgressiveGalleryImage"
import {
  isGallerySourceLoaded,
  markGallerySourceLoaded,
} from "@/shared/components/media/progressive-gallery-cache"

import { ListingGridCoverImage, type ListingGridCoverImageProps } from "./ListingGridCoverImage"

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
    resetProgressiveGalleryCacheForTests()
    vi.restoreAllMocks()
  })

  describe("defensive Cloudinary loading", () => {
    it("shows a blurred placeholder in a stable full-size frame before the cover loads", () => {
      renderGridCover({ alt: "Grid room" })

      const placeholder = screen.getByTestId("progressive-cover-placeholder")
      expect(placeholder).toHaveAttribute("src", expect.stringContaining("e_blur:200"))
      expect(placeholder).toHaveAttribute("src", expect.stringContaining("w_48"))
      expect(placeholder).toHaveAttribute("aria-hidden", "true")
      expect(placeholder).toHaveClass("absolute", "inset-0", "object-cover", "blur-xl")

      const frame = placeholder.parentElement
      expect(frame).toHaveClass("relative", "h-full", "w-full", "overflow-hidden")

      expect(getFullImage("Grid room")).toHaveClass("opacity-0")
    })

    it("reveals the sharp cover and removes the placeholder after load", async () => {
      renderGridCover({ alt: "Grid room" })

      const image = getFullImage("Grid room")
      fireEvent.load(image)

      await waitFor(() => {
        expect(image).toHaveClass("opacity-100")
      })
      expect(
        screen.queryByTestId("progressive-cover-placeholder"),
      ).not.toBeInTheDocument()
    })

    it("never shows a loading spinner for grid covers", () => {
      renderGridCover({ alt: "Grid room" })

      expect(screen.queryByLabelText("Loading photo")).not.toBeInTheDocument()
    })
  })

  describe("light grid delivery", () => {
    it("requests a capped 640px Cloudinary cover with lazy low-priority loading", () => {
      renderGridCover({ alt: "Grid room" })

      const image = getFullImage("Grid room")
      expect(image.getAttribute("src")).toContain("w_640")
      expect(image).toHaveAttribute("loading", "lazy")
      expect(image).toHaveAttribute("decoding", "async")
      expect(image).toHaveAttribute("fetchpriority", "low")
      expect(image).toHaveAttribute("draggable", "false")
    })

    it("loads external sources directly without an extra blur request", () => {
      renderGridCover({ alt: "External room", src: externalOne })

      expect(
        screen.queryByTestId("progressive-cover-placeholder"),
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
        screen.queryByTestId("progressive-cover-placeholder"),
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
      expect(screen.queryByTestId("progressive-cover-placeholder")).not.toBeInTheDocument()
    })
  })

  describe("cached covers", () => {
    it("opens instantly when the exact grid delivery url is already cached", async () => {
      const delivery = resolveCoverImageDelivery(cloudinaryOne)!
      markGallerySourceLoaded(delivery.fullUrl)

      renderGridCover({ alt: "Cached grid room" })

      const image = getFullImage("Cached grid room")
      Object.defineProperty(image, "complete", {
        configurable: true,
        value: true,
      })
      Object.defineProperty(image, "naturalWidth", {
        configurable: true,
        value: 640,
      })
      Object.defineProperty(image, "currentSrc", {
        configurable: true,
        value: delivery.fullUrl,
      })

      fireEvent.load(image)

      await waitFor(() => {
        expect(image).toHaveClass("opacity-100")
      })
      expect(image).not.toHaveClass("transition-opacity")
      expect(
        screen.queryByTestId("progressive-cover-placeholder"),
      ).not.toBeInTheDocument()
    })

    it("reuses the cache when the same listing cover renders again in the grid", async () => {
      const delivery = resolveCoverImageDelivery(cloudinaryOne)!

      renderGridCover({ alt: "Grid room" })
      fireEvent.load(getFullImage("Grid room"))

      await waitFor(() => {
        expect(isGallerySourceLoaded(delivery.fullUrl)).toBe(true)
      })

      cleanup()

      markGallerySourceLoaded(delivery.fullUrl)
      renderGridCover({ alt: "Grid room" })

      const image = getFullImage("Grid room")
      Object.defineProperty(image, "complete", {
        configurable: true,
        value: true,
      })
      Object.defineProperty(image, "naturalWidth", {
        configurable: true,
        value: 640,
      })
      Object.defineProperty(image, "currentSrc", {
        configurable: true,
        value: delivery.fullUrl,
      })

      fireEvent.load(image)

      await waitFor(() => {
        expect(image).toHaveClass("opacity-100")
      })
      expect(
        screen.queryByTestId("progressive-cover-placeholder"),
      ).not.toBeInTheDocument()
    })
  })

  describe("source changes", () => {
    it("shows blur again when the listing cover source changes mid-load", async () => {
      let resolveDecode: (() => void) | undefined
      Object.defineProperty(HTMLImageElement.prototype, "decode", {
        configurable: true,
        value: vi.fn(
          () =>
            new Promise<void>((resolve) => {
              resolveDecode = resolve
            }),
        ),
      })

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

      resolveDecode?.()
      await Promise.resolve()

      expect(screen.getByTestId("progressive-cover-placeholder")).toBeInTheDocument()
      expect(getFullImage("Grid room")).toHaveClass("opacity-0")

      delete (HTMLImageElement.prototype as { decode?: unknown }).decode
    })

    it("still reveals the cover when image decode rejects", async () => {
      Object.defineProperty(HTMLImageElement.prototype, "decode", {
        configurable: true,
        value: vi.fn().mockRejectedValueOnce(new Error("decode failed")),
      })

      renderGridCover({ alt: "Grid room" })

      const image = getFullImage("Grid room")
      fireEvent.load(image)

      await waitFor(() => {
        expect(image).toHaveClass("opacity-100")
      })

      delete (HTMLImageElement.prototype as { decode?: unknown }).decode
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

      expect(getFullImage("Styled room")).toHaveClass("opacity-90", "object-cover")
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
  })
})
