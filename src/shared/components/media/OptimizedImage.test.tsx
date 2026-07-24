import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { OptimizedImage } from "./OptimizedImage"

describe("OptimizedImage", () => {
  it("renders responsive Cloudinary attributes", () => {
    render(
      <OptimizedImage
        src="https://res.cloudinary.com/demo/image/upload/v1/photo.jpg"
        alt="Room"
        sizes="50vw"
        responsiveWidths={[320, 640]}
        fallback={<span>Unavailable</span>}
      />,
    )

    const image = screen.getByRole("img", { name: "Room" })
    expect(image).toHaveAttribute(
      "src",
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_640/v1/photo.jpg",
    )
    expect(image).toHaveAttribute("sizes", "50vw")
    expect(image).toHaveAttribute("loading", "lazy")
    expect(image).toHaveAttribute("decoding", "async")
  })

  it("shows its fallback after an image failure", () => {
    const onError = vi.fn()
    render(
      <OptimizedImage
        src="https://example.com/broken.jpg"
        alt="Room"
        onError={onError}
        fallback={<span>Unavailable</span>}
      />,
    )

    fireEvent.error(screen.getByRole("img", { name: "Room" }))

    expect(screen.getByText("Unavailable")).toBeInTheDocument()
    expect(onError).toHaveBeenCalledOnce()
  })

  it("can recover when its source changes", () => {
    const { rerender } = render(
      <OptimizedImage
        src="https://example.com/broken.jpg"
        alt="Room"
        fallback={<span>Unavailable</span>}
      />,
    )

    fireEvent.error(screen.getByRole("img", { name: "Room" }))
    rerender(
      <OptimizedImage
        src="https://example.com/replacement.jpg"
        alt="Room"
        fallback={<span>Unavailable</span>}
      />,
    )

    expect(screen.getByRole("img", { name: "Room" })).toHaveAttribute(
      "src",
      "https://example.com/replacement.jpg",
    )
  })
})
