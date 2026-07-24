import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { PhotoViewer, type PhotoViewerPhoto } from "./PhotoViewer"

const photos: PhotoViewerPhoto[] = [
  { id: "one", src: "https://example.com/one.jpg", alt: "First room" },
  { id: "two", src: "https://example.com/two.jpg", alt: "Second room" },
  { id: "three", src: "https://example.com/three.jpg", alt: "Third room" },
]

describe("PhotoViewer", () => {
  it("shows the selected photo and synchronizes thumbnail selection", () => {
    render(
      <PhotoViewer photos={photos} initialIndex={1} onClose={vi.fn()} />,
    )

    const dialog = screen.getByRole("dialog", { name: "Photo viewer" })
    expect(within(dialog).getByRole("img", { name: "Second room" })).toHaveAttribute(
      "src",
      "https://example.com/two.jpg",
    )
    expect(within(dialog).getByText("2 / 3")).toBeInTheDocument()

    const secondThumbnail = within(dialog).getByRole("button", {
      name: "Show photo 2",
    })
    expect(secondThumbnail).toHaveAttribute("aria-current", "true")

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Show photo 3" }),
    )

    expect(within(dialog).getByRole("img", { name: "Third room" })).toBeInTheDocument()
    expect(within(dialog).getByText("3 / 3")).toBeInTheDocument()
    expect(secondThumbnail).not.toHaveAttribute("aria-current")
    expect(
      within(dialog).getByRole("button", { name: "Show photo 3" }),
    ).toHaveAttribute("aria-current", "true")
  })

  it("exposes a horizontally scrollable thumbnail filmstrip", () => {
    render(<PhotoViewer photos={photos} onClose={vi.fn()} />)

    const filmstrip = screen.getByLabelText("Photo thumbnails")
    expect(filmstrip).toHaveClass(
      "overflow-x-auto",
      "[scrollbar-width:none]",
      "[&::-webkit-scrollbar]:hidden",
    )
    expect(
      within(filmstrip).getAllByRole("button", { name: /Show photo/ }),
    ).toHaveLength(3)
  })

  it("places photos on one gapless native scroll-snap track", () => {
    render(<PhotoViewer photos={photos} initialIndex={1} onClose={vi.fn()} />)

    const preview = screen.getByRole("group", { name: "Photo preview" })
    const scroller = preview.querySelector("[data-photo-scroller]")

    expect(scroller).toHaveClass("flex", "snap-x", "snap-mandatory", "overflow-x-auto")
    expect(scroller?.children).toHaveLength(3)
    expect(
      Array.from(scroller?.children ?? []).every(
        (slide) =>
          slide.classList.contains("w-full") &&
          slide.classList.contains("shrink-0"),
      ),
    ).toBe(true)
  })

  it("supports keyboard navigation, clamps at the ends, and closes with Escape", () => {
    const onClose = vi.fn()
    render(<PhotoViewer photos={photos} onClose={onClose} />)

    fireEvent.keyDown(document, { key: "ArrowLeft" })
    expect(screen.getByRole("img", { name: "First room" })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: "ArrowRight" })
    expect(screen.getByRole("img", { name: "Second room" })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: "Escape" })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("synchronizes selection with native horizontal scrolling", () => {
    render(<PhotoViewer photos={photos} onClose={vi.fn()} />)

    const preview = screen.getByRole("group", { name: "Photo preview" })
    const scroller = preview.querySelector<HTMLElement>("[data-photo-scroller]")!
    Object.defineProperty(scroller, "clientWidth", { value: 300 })

    scroller.scrollLeft = 310
    fireEvent.scroll(scroller)

    expect(screen.getByRole("img", { name: "Second room" })).toBeInTheDocument()

    scroller.scrollLeft = 999
    fireEvent.scroll(scroller)
    expect(screen.getByRole("img", { name: "Third room" })).toBeInTheDocument()
    expect(screen.getByText("3 / 3")).toBeInTheDocument()
  })

  it("smoothly scrolls the native track from thumbnail controls", () => {
    render(<PhotoViewer photos={photos} onClose={vi.fn()} />)

    const scroller = screen
      .getByRole("group", { name: "Photo preview" })
      .querySelector<HTMLElement>("[data-photo-scroller]")!
    const scrollTo = vi.fn()
    Object.defineProperties(scroller, {
      clientWidth: { value: 300 },
      scrollTo: { value: scrollTo },
    })

    fireEvent.click(screen.getByRole("button", { name: "Show photo 3" }))

    expect(scrollTo).toHaveBeenCalledWith({ left: 600, behavior: "smooth" })
    expect(screen.getByRole("img", { name: "Third room" })).toBeInTheDocument()

    scroller.scrollLeft = 300
    fireEvent.scroll(scroller)
    expect(screen.getByRole("img", { name: "Third room" })).toBeInTheDocument()

    fireEvent.wheel(scroller)
    fireEvent.scroll(scroller)
    expect(screen.getByRole("img", { name: "Second room" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Show photo 3" }))
    scroller.scrollLeft = 600
    fireEvent.scroll(scroller)
    expect(screen.getByRole("img", { name: "Third room" })).toBeInTheDocument()
  })

  it("normalizes malformed photos and uses a safe empty state", () => {
    const malformedPhotos = [
      { id: " ", src: " ", alt: "Ignored" },
      { id: "valid", src: " https://example.com/valid.jpg ", alt: " " },
    ] as PhotoViewerPhoto[]

    const { rerender } = render(
      <PhotoViewer
        photos={malformedPhotos}
        initialIndex={99}
        onClose={vi.fn()}
        title={null as unknown as string}
      />,
    )

    expect(screen.getByRole("dialog", { name: "Photo viewer" })).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Photo 2" })).toHaveAttribute(
      "src",
      "https://example.com/valid.jpg",
    )
    expect(screen.getAllByRole("button", { name: /Show photo/ })).toHaveLength(1)

    rerender(<PhotoViewer photos={null} onClose={vi.fn()} />)
    expect(screen.getByText("Photo unavailable")).toBeInTheDocument()
    expect(screen.queryByLabelText("Photo thumbnails")).not.toBeInTheDocument()
  })

  it("falls back when the active image cannot load", () => {
    render(<PhotoViewer photos={[photos[0]]} onClose={vi.fn()} />)

    fireEvent.error(screen.getByRole("img", { name: "First room" }))

    expect(screen.getByText("Photo unavailable")).toBeInTheDocument()
  })
})
