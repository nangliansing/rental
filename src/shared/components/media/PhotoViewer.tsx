import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  X,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { cn } from "@/lib/utils"
import { ModalPortal } from "@/shared/components/ModalPortal"
import { CloudinaryGalleryImage } from "@/shared/components/media/CloudinaryGalleryImage"
import { parseCloudinaryDeliveryUrl } from "@/shared/components/media/cloudinary-image"
import { OptimizedImage } from "@/shared/components/media/OptimizedImage"
import { useAccessibleModal } from "@/shared/hooks/useAccessibleModal"

export type PhotoViewerPhoto = {
  id: string
  src: string
  alt?: string | null
}

export type PhotoViewerProps = {
  photos?: PhotoViewerPhoto[] | null
  initialIndex?: number
  onClose: () => void
  title?: string
}

const SCROLL_DESTINATION_TOLERANCE_PX = 1
const THUMBNAIL_SETTLE_DELAY_MS = 120

function clampIndex(index: number, length: number) {
  if (!Number.isFinite(index) || length <= 0) return 0
  return Math.min(Math.max(Math.trunc(index), 0), length - 1)
}

function normalizePhotos(photos: PhotoViewerProps["photos"]) {
  if (!Array.isArray(photos)) return []

  return photos.flatMap((photo, index) => {
    const src = typeof photo?.src === "string" ? photo.src.trim() : ""
    if (!src) return []

    const id = typeof photo.id === "string" ? photo.id.trim() : ""
    const alt = typeof photo.alt === "string" ? photo.alt.trim() : ""

    return [{
      id: id || `photo-${index}`,
      src,
      alt: alt || `Photo ${index + 1}`,
    }]
  })
}

export function PhotoViewer({
  photos,
  initialIndex = 0,
  onClose,
  title = "Photo viewer",
}: PhotoViewerProps) {
  const { containerRef } = useAccessibleModal<HTMLDivElement>({
    isOpen: true,
    onClose,
  })
  const normalizedPhotos = useMemo(() => normalizePhotos(photos), [photos])
  const [selectedIndex, setSelectedIndex] = useState(() =>
    clampIndex(initialIndex, normalizedPhotos.length),
  )
  const previewRef = useRef<HTMLDivElement | null>(null)
  const hasPositionedInitialPhoto = useRef(false)
  const thumbnailRefs = useRef<Array<HTMLButtonElement | null>>([])
  const programmaticIndexRef = useRef<number | null>(null)
  const thumbnailSettleTimerRef = useRef<number | null>(null)
  const activeIndex = clampIndex(selectedIndex, normalizedPhotos.length)
  const showNavigation = normalizedPhotos.length > 1
  const accessibleTitle =
    typeof title === "string" && title.trim() ? title.trim() : "Photo viewer"

  const clearThumbnailSettleTimer = useCallback(() => {
    if (thumbnailSettleTimerRef.current === null) return

    window.clearTimeout(thumbnailSettleTimerRef.current)
    thumbnailSettleTimerRef.current = null
  }, [])

  const cancelProgrammaticNavigation = useCallback(() => {
    programmaticIndexRef.current = null
  }, [])

  const revealThumbnail = useCallback((index: number, behavior: ScrollBehavior) => {
    const thumbnail = thumbnailRefs.current[index]
    if (typeof thumbnail?.scrollIntoView !== "function") return

    thumbnail.scrollIntoView({
      behavior,
      block: "nearest",
      inline: "nearest",
    })
  }, [])

  const revealThumbnailAfterScroll = useCallback((index: number) => {
    clearThumbnailSettleTimer()

    thumbnailSettleTimerRef.current = window.setTimeout(() => {
      revealThumbnail(index, "smooth")
      thumbnailSettleTimerRef.current = null
    }, THUMBNAIL_SETTLE_DELAY_MS)
  }, [clearThumbnailSettleTimer, revealThumbnail])

  const selectPhoto = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const nextIndex = clampIndex(index, normalizedPhotos.length)
      const preview = previewRef.current

      clearThumbnailSettleTimer()
      setSelectedIndex(nextIndex)
      revealThumbnail(nextIndex, behavior)

      if (!preview || preview.clientWidth <= 0) return

      const targetLeft = nextIndex * preview.clientWidth
      programmaticIndexRef.current =
        Math.abs(preview.scrollLeft - targetLeft) >
        SCROLL_DESTINATION_TOLERANCE_PX
          ? nextIndex
          : null

      if (typeof preview.scrollTo === "function") {
        preview.scrollTo({ left: targetLeft, behavior })
      } else {
        preview.scrollLeft = targetLeft
        programmaticIndexRef.current = null
      }
    },
    [clearThumbnailSettleTimer, normalizedPhotos.length, revealThumbnail],
  )

  const handlePreviewScroll = () => {
    const preview = previewRef.current
    if (!preview || preview.clientWidth <= 0) return

    const nextIndex = clampIndex(
      Math.round(preview.scrollLeft / preview.clientWidth),
      normalizedPhotos.length,
    )

    const programmaticIndex = programmaticIndexRef.current
    if (programmaticIndex !== null) {
      const targetLeft = programmaticIndex * preview.clientWidth
      if (
        Math.abs(preview.scrollLeft - targetLeft) <=
        SCROLL_DESTINATION_TOLERANCE_PX
      ) {
        programmaticIndexRef.current = null
        revealThumbnailAfterScroll(programmaticIndex)
      }
      return
    }

    setSelectedIndex((current) => current === nextIndex ? current : nextIndex)
    revealThumbnailAfterScroll(nextIndex)
  }

  useLayoutEffect(() => {
    const preview = previewRef.current
    if (
      hasPositionedInitialPhoto.current ||
      !preview ||
      preview.clientWidth <= 0
    ) {
      return
    }

    preview.scrollLeft = activeIndex * preview.clientWidth
    hasPositionedInitialPhoto.current = true
  }, [activeIndex])

  useEffect(() => {
    const handleResize = () => selectPhoto(activeIndex, "auto")
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [activeIndex, selectPhoto])

  useEffect(() => {
    return clearThumbnailSettleTimer
  }, [clearThumbnailSettleTimer])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        selectPhoto(activeIndex - 1)
      }

      if (event.key === "ArrowRight") {
        selectPhoto(activeIndex + 1)
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [activeIndex, selectPhoto])

  return (
    <ModalPortal>
      <div
        ref={containerRef}
        className="fixed inset-0 z-[9999] flex h-dvh flex-col bg-black text-white"
        role="dialog"
        aria-modal="true"
        aria-label={accessibleTitle}
      >
        <header className="flex h-16 shrink-0 items-center justify-between px-3 sm:px-5">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            onClick={onClose}
            aria-label="Close photo viewer"
            autoFocus
          >
            <X className="h-5 w-5" />
          </button>

          {normalizedPhotos.length > 0 && (
            <p className="text-sm font-semibold tabular-nums text-white/90" aria-live="polite">
              {activeIndex + 1} / {normalizedPhotos.length}
            </p>
          )}
        </header>

        <div
          className="relative min-h-0 flex-1 overflow-hidden"
          role="group"
          aria-label="Photo preview"
        >
          <div
            ref={previewRef}
            data-photo-scroller
            className="flex h-full snap-x snap-mandatory touch-pan-x overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onScroll={handlePreviewScroll}
            onPointerDown={cancelProgrammaticNavigation}
            onWheel={cancelProgrammaticNavigation}
          >
            {normalizedPhotos.length > 0 ? (
              normalizedPhotos.map((photo, index) => (
                <div
                  key={`${index}-${photo.id}`}
                  className="h-full w-full shrink-0 snap-center snap-always bg-black"
                  aria-hidden={index === activeIndex ? undefined : true}
                >
                  <GalleryImage
                    photo={photo}
                    className="h-full w-full object-contain"
                    variant={index === activeIndex ? "hero" : "adjacent"}
                  />
                </div>
              ))
            ) : (
              <div className="h-full w-full shrink-0">
                <EmptyPhotoState />
              </div>
            )}
          </div>

          {showNavigation && (
            <>
              <NavigationButton
                direction="previous"
                disabled={activeIndex === 0}
                onClick={() => selectPhoto(activeIndex - 1)}
              />
              <NavigationButton
                direction="next"
                disabled={activeIndex === normalizedPhotos.length - 1}
                onClick={() => selectPhoto(activeIndex + 1)}
              />
            </>
          )}
        </div>

        {normalizedPhotos.length > 0 && (
          <div
            className="shrink-0 overflow-x-auto border-t border-white/10 px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-5"
            aria-label="Photo thumbnails"
          >
            <div className="mx-auto flex w-max min-w-full justify-center gap-2">
              {normalizedPhotos.map((photo, index) => {
                const isActive = index === activeIndex

                return (
                  <button
                    key={`${photo.id}-${index}`}
                    ref={(element) => {
                      thumbnailRefs.current[index] = element
                    }}
                    type="button"
                    className={cn(
                      "h-16 w-20 shrink-0 overflow-hidden rounded border-2 bg-white/5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:h-20 sm:w-24",
                      isActive
                        ? "border-white opacity-100"
                        : "border-transparent opacity-55 hover:opacity-90",
                    )}
                    onClick={() => selectPhoto(index)}
                    aria-label={`Show photo ${index + 1}`}
                    aria-current={isActive ? "true" : undefined}
                  >
                    <GalleryImage
                      photo={photo}
                      className="h-full w-full object-cover"
                      variant="thumbnail"
                    />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </ModalPortal>
  )
}

const GALLERY_IMAGE_WIDTHS = [640, 960, 1280, 1600] as const

type GalleryImageVariant = "hero" | "adjacent" | "thumbnail"

function GalleryImage({
  photo,
  className,
  variant = "hero",
}: {
  photo: PhotoViewerPhoto
  className?: string
  variant?: GalleryImageVariant
}) {
  if (variant === "thumbnail") {
    return (
      <OptimizedImage
        src={photo.src}
        alt=""
        className={className}
        width={160}
        height={120}
        sizes="80px"
        responsiveWidths={[80, 160]}
        loading="lazy"
        fetchPriority="low"
        draggable={false}
        fallback={<EmptyPhotoState compact />}
      />
    )
  }

  const isHero = variant === "hero"
  const cloudinarySource = parseCloudinaryDeliveryUrl(photo.src)

  if (cloudinarySource) {
    return (
      <CloudinaryGalleryImage
        src={photo.src}
        alt={isHero ? photo.alt || "Photo" : ""}
        className={className}
        width={1600}
        height={1200}
        sizes="100vw"
        responsiveSteps={GALLERY_IMAGE_WIDTHS}
        eager={isHero}
        fetchPriority={isHero ? "high" : "low"}
        decoding="async"
        draggable={false}
        fallback={<EmptyPhotoState />}
      />
    )
  }

  return (
    <OptimizedImage
      src={photo.src}
      alt={isHero ? photo.alt || "Photo" : ""}
      className={className}
      width={1600}
      height={1200}
      sizes="100vw"
      responsiveWidths={GALLERY_IMAGE_WIDTHS}
      loading={isHero ? "eager" : "lazy"}
      fetchPriority={isHero ? "high" : "low"}
      decoding="async"
      draggable={false}
      fallback={<EmptyPhotoState />}
    />
  )
}

function EmptyPhotoState({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center text-white/45",
        !compact && "gap-2",
      )}
    >
      <ImageIcon className={compact ? "h-5 w-5" : "h-10 w-10"} />
      {!compact && <p className="text-sm font-medium">Photo unavailable</p>}
    </div>
  )
}

function NavigationButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "previous" | "next"
  disabled: boolean
  onClick: () => void
}) {
  const isPrevious = direction === "previous"
  const Icon = isPrevious ? ChevronLeft : ChevronRight

  return (
    <button
      type="button"
      className={cn(
        "absolute top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:flex",
        isPrevious ? "left-4" : "right-4",
        disabled && "pointer-events-none opacity-0",
      )}
      disabled={disabled}
      onClick={onClick}
      aria-label={isPrevious ? "Previous photo" : "Next photo"}
    >
      <Icon className="h-7 w-7" />
    </button>
  )
}
