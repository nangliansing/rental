import { Loader2 } from "lucide-react"
import type { ImgHTMLAttributes, ReactEventHandler, RefObject } from "react"

import { cn } from "@/lib/utils"

import type { GalleryImageDelivery } from "./gallery-image-delivery"

export const PROGRESSIVE_REVEAL_MS = {
  cover: 200,
  gallery: 240,
} as const

export const PROGRESSIVE_IMAGE_TEST_ID = {
  coverPlaceholder: "progressive-cover-placeholder",
  galleryPlaceholder: "progressive-gallery-placeholder",
} as const

const PLACEHOLDER_CLASS =
  "absolute inset-0 h-full w-full scale-110 object-cover opacity-90"

type ProgressiveImageFrameProps = {
  delivery: GalleryImageDelivery
  variant: "cover" | "gallery"
  isLoaded: boolean
  animateReveal: boolean
  showSpinner: boolean
  fullImageRef: RefObject<HTMLImageElement | null>
  alt?: string
  className?: string
  loading: ImgHTMLAttributes<HTMLImageElement>["loading"]
  decoding: ImgHTMLAttributes<HTMLImageElement>["decoding"]
  fetchPriority: ImgHTMLAttributes<HTMLImageElement>["fetchPriority"]
  draggable: boolean
  onLoad: ReactEventHandler<HTMLImageElement>
  onError: ReactEventHandler<HTMLImageElement>
  imageProps: Omit<
    ImgHTMLAttributes<HTMLImageElement>,
    "src" | "srcSet" | "alt" | "className" | "loading" | "decoding" | "draggable"
  >
}

export function ProgressiveImageFrame({
  delivery,
  variant,
  isLoaded,
  animateReveal,
  showSpinner,
  fullImageRef,
  alt,
  className,
  loading,
  decoding,
  fetchPriority,
  draggable,
  onLoad,
  onError,
  imageProps,
}: ProgressiveImageFrameProps) {
  const isGallery = variant === "gallery"
  const showPlaceholder = Boolean(delivery.placeholderUrl) && !isLoaded
  const objectFitClass = isGallery ? "object-contain" : "object-cover"
  const placeholderTestId = isGallery
    ? PROGRESSIVE_IMAGE_TEST_ID.galleryPlaceholder
    : PROGRESSIVE_IMAGE_TEST_ID.coverPlaceholder

  return (
    <div
      className={cn(
        "relative isolate h-full w-full overflow-hidden",
        isGallery ? "bg-black" : "bg-slate-200",
      )}
      aria-busy={showSpinner || undefined}
    >
      {showPlaceholder && delivery.placeholderUrl && (
        <img
          src={delivery.placeholderUrl}
          alt=""
          aria-hidden="true"
          data-testid={placeholderTestId}
          className={cn(
            PLACEHOLDER_CLASS,
            isGallery ? "blur-2xl" : "blur-xl",
          )}
          draggable={false}
          decoding="async"
          loading="eager"
          fetchPriority="low"
        />
      )}

      {showSpinner && (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
          role="status"
          aria-label="Loading photo"
        >
          <Loader2 className="h-8 w-8 animate-spin text-white/85" />
        </div>
      )}

      <img
        {...imageProps}
        ref={fullImageRef}
        src={delivery.fullUrl}
        alt={alt}
        className={cn(
          "absolute inset-0 z-[1] h-full w-full",
          objectFitClass,
          isLoaded ? "opacity-100" : "opacity-0",
          animateReveal && "transition-opacity ease-out",
          className,
        )}
        style={
          animateReveal
            ? { transitionDuration: `${PROGRESSIVE_REVEAL_MS[variant]}ms` }
            : undefined
        }
        loading={loading}
        decoding={decoding}
        fetchPriority={fetchPriority}
        draggable={draggable}
        onLoad={onLoad}
        onError={onError}
      />
    </div>
  )
}
