import { ImageIcon } from "lucide-react"
import { memo } from "react"

import { cn } from "@/lib/utils"
import { ProgressiveCoverImage } from "@/shared/components/media/ProgressiveCoverImage"

export type ListingGridCoverImageProps = {
  src?: string | null
  alt: string
  className?: string
  fallbackClassName?: string
}

export const ListingGridCoverImage = memo(function ListingGridCoverImage({
  src,
  alt,
  className,
  fallbackClassName,
}: ListingGridCoverImageProps) {
  const fallback = (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-200",
        fallbackClassName,
      )}
    >
      <ImageIcon aria-hidden="true" className="h-8 w-8 text-current" />
    </div>
  )

  return (
    <ProgressiveCoverImage
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      draggable={false}
      fallback={fallback}
    />
  )
})
