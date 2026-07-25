import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createRef } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ProgressiveImageFrame } from "./ProgressiveImageFrame"

const delivery = {
  cacheKey: "https://res.cloudinary.com/demo/image/upload/v123/listing/room.jpg",
  fullUrl:
    "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_640/v123/listing/room.jpg",
  placeholderUrl:
    "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_48/e_blur:800/v123/listing/room.jpg",
}

describe("ProgressiveImageFrame", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("isolates stacking and keeps the full image absolutely positioned", () => {
    const fullImageRef = createRef<HTMLImageElement>()

    const { container } = render(
      <div className="relative aspect-[4/3]">
        <ProgressiveImageFrame
          delivery={delivery}
          variant="cover"
          isLoaded={false}
          animateReveal
          showSpinner={false}
          fullImageRef={fullImageRef}
          alt="Room photo"
          loading="lazy"
          decoding="async"
          fetchPriority="auto"
          draggable={false}
          onLoad={() => undefined}
          onError={() => undefined}
          imageProps={{}}
        />
      </div>,
    )

    const frame = container.querySelector(".relative.isolate")
    expect(frame).toHaveClass("h-full", "w-full", "overflow-hidden", "bg-slate-200")

    const fullImage = screen.getByRole("img", { name: "Room photo" })
    expect(fullImage).toHaveClass("absolute", "inset-0", "z-[1]", "opacity-0")
    expect(screen.getByTestId("progressive-cover-placeholder")).toHaveClass(
      "absolute",
      "inset-0",
      "blur-xl",
    )
  })

  it("hides the placeholder after load for gallery variant", async () => {
    const fullImageRef = createRef<HTMLImageElement>()

    const { rerender } = render(
      <ProgressiveImageFrame
        delivery={delivery}
        variant="gallery"
        isLoaded={false}
        animateReveal
        showSpinner
        fullImageRef={fullImageRef}
        alt="Gallery photo"
        loading="eager"
        decoding="async"
        fetchPriority="high"
        draggable={false}
        onLoad={() => undefined}
        onError={() => undefined}
        imageProps={{}}
      />,
    )

    expect(screen.getByTestId("progressive-gallery-placeholder")).toBeInTheDocument()
    expect(screen.getByLabelText("Loading photo")).toBeInTheDocument()

    fireEvent.load(screen.getByRole("img", { name: "Gallery photo" }))

    rerender(
      <ProgressiveImageFrame
        delivery={delivery}
        variant="gallery"
        isLoaded
        animateReveal={false}
        showSpinner={false}
        fullImageRef={fullImageRef}
        alt="Gallery photo"
        loading="eager"
        decoding="async"
        fetchPriority="high"
        draggable={false}
        onLoad={() => undefined}
        onError={() => undefined}
        imageProps={{}}
      />,
    )

    await waitFor(() => {
      expect(
        screen.queryByTestId("progressive-gallery-placeholder"),
      ).not.toBeInTheDocument()
    })
    expect(screen.queryByLabelText("Loading photo")).not.toBeInTheDocument()
  })
})
