import { ImageIcon } from "lucide-react"
import type { ImgHTMLAttributes } from "react"

import type { ListingMedia } from "@/features/map-search/types"
import { cn } from "@/lib/utils"
import { OptimizedImage } from "@/shared/components/media/OptimizedImage"

import {
  formatBedroom,
  formatCompactMoney,
  formatMoney,
} from "../utils/listingDisplay"

type ListingCoverPhoto = Partial<Pick<ListingMedia, "secureUrl" | "alt">>

type ListingCoverImageProps = {
  photo?: ListingCoverPhoto | null
  altFallback?: string
  fallbackLabel?: string
  className?: string
  fallbackClassName?: string
  loading?: ImgHTMLAttributes<HTMLImageElement>["loading"]
  fetchPriority?: ImgHTMLAttributes<HTMLImageElement>["fetchPriority"]
  sizes?: string
}

export function ListingCoverImage({
  photo,
  altFallback = "Listing photo",
  fallbackLabel,
  className,
  fallbackClassName,
  loading = "lazy",
  fetchPriority = "auto",
  sizes = "(min-width: 1280px) 25vw, (min-width: 640px) 33vw, 50vw",
}: ListingCoverImageProps) {
  const imageUrl = normalizeText(photo?.secureUrl)
  const alt = normalizeText(photo?.alt) || normalizeText(altFallback) || "Listing photo"
  const normalizedFallbackLabel = normalizeText(fallbackLabel)

  const fallback = (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-2",
        fallbackClassName,
      )}
    >
      <ImageIcon aria-hidden="true" className="h-8 w-8 text-current" />
      {normalizedFallbackLabel && (
        <span aria-hidden="true" className="text-xs font-medium">
          {normalizedFallbackLabel}
        </span>
      )}
    </div>
  )

  return (
    <OptimizedImage
      src={imageUrl}
      alt={alt}
      className={cn("h-full w-full object-cover", className)}
      width={640}
      height={640}
      sizes={sizes}
      loading={loading}
      fetchPriority={fetchPriority}
      fallback={fallback}
    />
  )
}

export function ListingPrice({
  value,
  compact = true,
  className,
}: {
  value?: number | null
  compact?: boolean
  className?: string
}) {
  return (
    <span className={className}>
      {compact ? formatCompactMoney(value) : formatMoney(value)}
    </span>
  )
}

export function ListingRoomSummary({
  bedroomCount,
  size,
  className,
}: {
  bedroomCount?: number | null
  size?: number | null
  className?: string
}) {
  const normalizedSize =
    typeof size === "number" && Number.isFinite(size) && size > 0 ? size : null

  return (
    <span className={className}>
      {formatBedroom(bedroomCount)}
      {normalizedSize !== null ? ` · ${normalizedSize.toLocaleString()} sqm` : ""}
    </span>
  )
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}
