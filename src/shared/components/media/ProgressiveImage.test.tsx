import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ProgressiveImage } from "./ProgressiveImage"

const cloudinarySource =
  "https://res.cloudinary.com/demo/image/upload/v1/photo.jpg"

describe("ProgressiveImage", () => {
  it("crossfades only after the full image has decoded", async () => {
    let finishDecode: (() => void) | undefined
    const decode = vi.fn(
      () => new Promise<void>((resolve) => {
        finishDecode = resolve
      }),
    )

    render(
      <ProgressiveImage
        src={cloudinarySource}
        alt="Room"
        className="object-contain"
        fallback={<span>Unavailable</span>}
      />,
    )

    const preview = screen.getByRole("presentation", { hidden: true })
    const fullImage = screen.getByRole("img", { name: "Room" })
    Object.defineProperty(fullImage, "decode", { value: decode })

    expect(preview).toHaveAttribute(
      "src",
      expect.stringContaining("w_96"),
    )
    expect(preview).toHaveClass("opacity-100", "blur-md", "duration-500")
    expect(fullImage).toHaveClass("opacity-0", "duration-500")

    fireEvent.load(fullImage)
    expect(decode).toHaveBeenCalledOnce()
    expect(fullImage).toHaveClass("opacity-0")

    await act(async () => finishDecode?.())

    expect(preview).toHaveClass("opacity-0")
    expect(fullImage).toHaveClass("opacity-100")
  })

  it("reveals after load when image decoding is unavailable", () => {
    render(
      <ProgressiveImage
        src={cloudinarySource}
        alt="Room"
        fallback={<span>Unavailable</span>}
      />,
    )

    const fullImage = screen.getByRole("img", { name: "Room" })
    Object.defineProperty(fullImage, "decode", { value: undefined })
    fireEvent.load(fullImage)

    expect(fullImage).toHaveClass("opacity-100")
  })

  it("avoids a duplicate request when no distinct preview can be generated", () => {
    render(
      <ProgressiveImage
        src="https://example.com/photo.jpg"
        alt="Room"
        fallback={<span>Unavailable</span>}
      />,
    )

    expect(screen.getAllByRole("img")).toHaveLength(1)
    expect(screen.getByRole("img", { name: "Room" })).not.toHaveClass("opacity-0")
  })

  it("removes the preview and exposes the fallback when the full image fails", () => {
    render(
      <ProgressiveImage
        src={cloudinarySource}
        alt="Room"
        fallback={<span>Unavailable</span>}
      />,
    )

    const preview = screen.getByRole("presentation", { hidden: true })
    fireEvent.error(screen.getByRole("img", { name: "Room" }))

    expect(preview).toHaveClass("opacity-0")
    expect(screen.getByText("Unavailable")).toBeInTheDocument()
  })
})
