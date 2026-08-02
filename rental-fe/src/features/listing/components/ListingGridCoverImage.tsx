import { ImageIcon } from "lucide-react"
import { memo, useLayoutEffect, useMemo, useRef, useState } from "react"

import { cn } from "@/lib/utils"
import {
  GRID_COVER_REVEAL_MS,
  GRID_COVER_SIZES,
  resolveGridCoverImageDelivery,
} from "@/shared/components/media/grid-image-delivery"

export const LISTING_GRID_COVER_TEST_ID = "listing-grid-cover"
export const LISTING_GRID_COVER_BLUR_TEST_ID = "listing-grid-cover-blur"

export type ListingGridCoverImageProps = {
  src?: string | null
  alt: string
  /** Pinterest-style dominant color under the blur; skips the tiny blur request when set. */
  placeholderColor?: string | null
  className?: string
  fallbackClassName?: string
}

function ListingGridCoverFallback({
  alt,
  className,
}: {
  alt: string
  className?: string
}) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-200",
        className,
      )}
    >
      <ImageIcon aria-hidden="true" className="h-8 w-8 text-current" />
    </div>
  )
}

function isImageReady(image: HTMLImageElement | null) {
  return Boolean(image?.complete) && (image?.naturalWidth ?? 0) > 0
}

function ListingGridCoverImageComponent({
  src,
  alt,
  placeholderColor,
  className,
  fallbackClassName,
}: ListingGridCoverImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const resolvedPlaceholderColor =
    typeof placeholderColor === "string" ? placeholderColor.trim() : ""
  const delivery = useMemo(
    () =>
      resolveGridCoverImageDelivery(src, {
        useBlurPlaceholder: !resolvedPlaceholderColor,
      }),
    [resolvedPlaceholderColor, src],
  )

  useLayoutEffect(() => {
    if (!delivery) return

    setIsLoaded(false)

    const image = imageRef.current
    if (isImageReady(image)) {
      setIsLoaded(true)
    }
  }, [delivery?.cacheKey])

  if (!delivery || failedSource === delivery.cacheKey) {
    return <ListingGridCoverFallback alt={alt} className={fallbackClassName} />
  }

  const showBlurPlaceholder = Boolean(delivery.placeholderUrl) && !isLoaded

  return (
    <div
      data-testid={LISTING_GRID_COVER_TEST_ID}
      className="relative isolate h-full w-full overflow-hidden bg-slate-200"
      style={
        resolvedPlaceholderColor
          ? { backgroundColor: resolvedPlaceholderColor }
          : undefined
      }
    >
      {showBlurPlaceholder && delivery.placeholderUrl && (
        <div
          data-testid={LISTING_GRID_COVER_BLUR_TEST_ID}
          aria-hidden="true"
          className="absolute inset-0 scale-110 bg-cover bg-center blur-xl"
          style={{ backgroundImage: `url("${delivery.placeholderUrl}")` }}
        />
      )}

      <img
        ref={imageRef}
        src={delivery.src}
        srcSet={delivery.srcSet}
        sizes={delivery.srcSet ? GRID_COVER_SIZES : undefined}
        alt={alt}
        className={cn(
          "absolute inset-0 z-[1] h-full w-full object-cover transition-opacity ease-out",
          className,
          isLoaded ? "opacity-100" : "opacity-0",
        )}
        style={{ transitionDuration: `${GRID_COVER_REVEAL_MS}ms` }}
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        draggable={false}
        onLoad={() => {
          setIsLoaded(true)
        }}
        onError={() => {
          setFailedSource(delivery.cacheKey)
        }}
      />
    </div>
  )
}

function listingGridCoverImagePropsAreEqual(
  previous: ListingGridCoverImageProps,
  next: ListingGridCoverImageProps,
) {
  return (
    previous.src === next.src &&
    previous.alt === next.alt &&
    previous.placeholderColor === next.placeholderColor &&
    previous.className === next.className &&
    previous.fallbackClassName === next.fallbackClassName
  )
}

export const ListingGridCoverImage = memo(
  ListingGridCoverImageComponent,
  listingGridCoverImagePropsAreEqual,
)
