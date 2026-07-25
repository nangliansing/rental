import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { PhotoViewer, type PhotoViewerPhoto } from "./PhotoViewer"
import { resetProgressiveGalleryCacheForTests } from "./ProgressiveGalleryImage"
import { resetProgressiveGalleryPrefetchForTests } from "./prefetch-progressive-gallery-image"

vi.mock("./prefetch-progressive-gallery-image", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("./prefetch-progressive-gallery-image")
  >()

  return {
    ...actual,
    prefetchProgressiveGalleryImage: vi.fn(),
  }
})

import { prefetchProgressiveGalleryImage } from "./prefetch-progressive-gallery-image"

const cloudinaryPhotos: PhotoViewerPhoto[] = [
  {
    id: "one",
    src: "https://res.cloudinary.com/demo/image/upload/v123/listing/one.jpg",
    alt: "First room",
  },
  {
    id: "two",
    src: "https://res.cloudinary.com/demo/image/upload/v123/listing/two.jpg",
    alt: "Second room",
  },
  {
    id: "three",
    src: "https://res.cloudinary.com/demo/image/upload/v123/listing/three.jpg",
    alt: "Third room",
  },
]

describe("PhotoViewer progressive scenarios", () => {
  afterEach(() => {
    cleanup()
    resetProgressiveGalleryCacheForTests()
    resetProgressiveGalleryPrefetchForTests()
    vi.clearAllMocks()
  })

  it("shows a Cloudinary placeholder for the active slide", () => {
    render(<PhotoViewer photos={cloudinaryPhotos} onClose={vi.fn()} />)

    expect(screen.getAllByTestId("progressive-gallery-placeholder").length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText("Loading photo").length).toBeGreaterThan(0)
  })

  it("prefetches adjacent slides when opening the middle photo", () => {
    render(
      <PhotoViewer photos={cloudinaryPhotos} initialIndex={1} onClose={vi.fn()} />,
    )

    expect(prefetchProgressiveGalleryImage).toHaveBeenCalledWith(
      cloudinaryPhotos[0]!.src,
    )
    expect(prefetchProgressiveGalleryImage).toHaveBeenCalledWith(
      cloudinaryPhotos[2]!.src,
    )
  })

  it("keeps cached slides sharp when navigating back", async () => {
    render(<PhotoViewer photos={cloudinaryPhotos} onClose={vi.fn()} />)

    const dialog = screen.getByRole("dialog", { name: "Photo viewer" })
    const firstImage = within(dialog).getByRole("img", { name: "First room" })

    fireEvent.load(firstImage)

    await waitFor(() => {
      expect(firstImage).toHaveClass("opacity-100")
    })

    fireEvent.click(within(dialog).getByRole("button", { name: "Show photo 2" }))
    expect(
      within(dialog).getByRole("img", { name: "Second room" }),
    ).toHaveClass("opacity-0")

    fireEvent.click(within(dialog).getByRole("button", { name: "Show photo 1" }))

    const restoredImage = within(dialog).getByRole("img", { name: "First room" })
    expect(restoredImage).toHaveClass("opacity-100")
    expect(restoredImage).not.toHaveClass("transition-opacity")
  })

  it("falls back per slide when a Cloudinary photo fails", () => {
    render(<PhotoViewer photos={[cloudinaryPhotos[0]!]} onClose={vi.fn()} />)

    const dialog = screen.getByRole("dialog", { name: "Photo viewer" })
    fireEvent.error(within(dialog).getByRole("img", { name: "First room" }))

    expect(within(dialog).getByText("Photo unavailable")).toBeInTheDocument()
  })

  it("hides next and previous controls for a single photo", () => {
    render(<PhotoViewer photos={[cloudinaryPhotos[0]!]} onClose={vi.fn()} />)

    const dialog = screen.getByRole("dialog", { name: "Photo viewer" })

    expect(
      within(dialog).queryByRole("button", { name: "Previous photo" }),
    ).not.toBeInTheDocument()
    expect(
      within(dialog).queryByRole("button", { name: "Next photo" }),
    ).not.toBeInTheDocument()
    expect(
      within(dialog).getAllByRole("button", { name: /Show photo/ }),
    ).toHaveLength(1)
  })
})
