import { useRef, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
} from "lucide-react"

import type { ListingMedia } from "@/features/map-search/types"
import { OptimizedImage } from "@/shared/components/media/OptimizedImage"

import { ListingPhotoViewer } from "./ListingPhotoViewer"

type ListingPhotoCarouselProps = {
  photos: ListingMedia[]
}

function clampIndex(index: number, length: number) {
  return Math.min(Math.max(index, 0), Math.max(length - 1, 0))
}

export function ListingPhotoCarousel({ photos }: ListingPhotoCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  const displayPhotos = photos.length > 0 ? photos : [null]
  const showNavigation = photos.length > 1

  const handleScroll = () => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const itemWidth = scroller.clientWidth
    if (itemWidth <= 0) return

    const nextIndex = Math.round(scroller.scrollLeft / itemWidth)
    setActiveIndex(clampIndex(nextIndex, displayPhotos.length))
  }

  const scrollToPhoto = (index: number) => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const nextIndex = clampIndex(index, displayPhotos.length)

    scroller.scrollTo({
      left: nextIndex * scroller.clientWidth,
      behavior: "smooth",
    })
    setActiveIndex(nextIndex)
  }

  return (
    <div className="group relative overflow-hidden bg-slate-100">
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={handleScroll}
      >
        {displayPhotos.map((photo, index) => (
          <div
            key={photo?.publicId ?? `empty-${index}`}
            className="relative aspect-[4/3] w-full shrink-0 snap-center bg-slate-200"
          >
            {photo ? (
              <button
                type="button"
                className="block h-full w-full cursor-zoom-in"
                onClick={() => setViewerIndex(index)}
                aria-label={`Open photo ${index + 1}`}
              >
                <OptimizedImage
                  src={photo.secureUrl}
                  alt={photo.alt ?? "Room photo"}
                  className="h-full w-full object-cover"
                  width={960}
                  height={720}
                  sizes="(min-width: 1280px) 220px, 100vw"
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  fallback={
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <ImageIcon aria-hidden="true" className="h-8 w-8" />
                      <span className="sr-only">Photo unavailable</span>
                    </div>
                  }
                />
              </button>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                <ImageIcon className="h-8 w-8" />
                <span className="text-sm font-medium">No photo</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {showNavigation && (
        <>
          <div className="absolute right-3 top-3 rounded-full bg-slate-950/75 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {activeIndex + 1}/{photos.length}
          </div>

          {activeIndex > 0 && (
            <button
              type="button"
              className="absolute left-3 top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/55 text-slate-950 opacity-70 shadow-sm ring-1 ring-white/60 backdrop-blur-md transition hover:bg-white/90 hover:opacity-100 md:flex md:group-hover:opacity-100"
              onClick={() => scrollToPhoto(activeIndex - 1)}
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>
          )}

          {activeIndex < photos.length - 1 && (
            <button
              type="button"
              className="absolute right-3 top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/55 text-slate-950 opacity-70 shadow-sm ring-1 ring-white/60 backdrop-blur-md transition hover:bg-white/90 hover:opacity-100 md:flex md:group-hover:opacity-100"
              onClick={() => scrollToPhoto(activeIndex + 1)}
              aria-label="Next photo"
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </button>
          )}
        </>
      )}

      {viewerIndex !== null && photos.length > 0 && (
        <ListingPhotoViewer
          photos={photos}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  )
}
