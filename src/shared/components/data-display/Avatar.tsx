import { UserRound } from "lucide-react"
import type { ImgHTMLAttributes } from "react"

import { cn } from "@/lib/utils"
import { OptimizedImage } from "@/shared/components/media/OptimizedImage"

import { getAvatarInitial, normalizeAvatarText } from "./avatar-utils"

type AvatarPhoto = {
  secureUrl?: string | null
  alt?: string | null
}

const SIZE_STYLES = {
  xs: "h-7 w-7 text-xs",
  sm: "h-9 w-9 text-sm",
  md: "h-11 w-11 text-base",
  lg: "h-12 w-12 text-lg",
  xl: "h-16 w-16 text-xl",
  uploader: "h-28 w-28 text-4xl",
  profile: "h-40 w-40 text-5xl md:h-36 md:w-36 lg:h-40 lg:w-40",
} as const

const SIZE_PIXELS: Record<AvatarSize, number> = {
  xs: 28,
  sm: 36,
  md: 44,
  lg: 48,
  xl: 64,
  uploader: 112,
  profile: 160,
}

const INITIAL_COLOR_STYLES = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-800",
  "bg-cyan-100 text-cyan-800",
  "bg-indigo-100 text-indigo-700",
] as const

export type AvatarSize = keyof typeof SIZE_STYLES

export type AvatarProps = {
  displayName?: string | null
  photo?: AvatarPhoto | null
  colorKey?: string | null
  size?: AvatarSize
  className?: string
  imageClassName?: string
  alt?: string
  loading?: ImgHTMLAttributes<HTMLImageElement>["loading"]
}

export function Avatar({
  displayName,
  photo,
  colorKey,
  size = "md",
  className,
  imageClassName,
  alt,
  loading = "lazy",
}: AvatarProps) {
  const normalizedName = normalizeAvatarText(displayName)
  const imageUrl = normalizeAvatarText(photo?.secureUrl)
  const accessibleLabel =
    normalizeAvatarText(photo?.alt) ||
    normalizeAvatarText(alt) ||
    (normalizedName ? `${normalizedName} profile photo` : "Profile photo")
  const initial = getAvatarInitial(normalizedName)
  const colorStyle = getInitialColorStyle(
    normalizeAvatarText(colorKey) || normalizedName,
  )
  const pixelSize = SIZE_PIXELS[size]
  const fallback = (
    <span
      role="img"
      aria-label={accessibleLabel}
      className="flex h-full w-full items-center justify-center font-semibold uppercase"
    >
      {initial ? (
        <span aria-hidden="true">{initial}</span>
      ) : (
        <UserRound aria-hidden="true" className="h-[42%] w-[42%]" />
      )}
    </span>
  )

  return (
    <span
      className={cn(
        "inline-flex shrink-0 overflow-hidden rounded-full ring-1 ring-black/5",
        SIZE_STYLES[size],
        initial ? colorStyle : "bg-slate-100 text-slate-400",
        className,
      )}
    >
      <OptimizedImage
        src={imageUrl}
        alt={accessibleLabel}
        className={cn("h-full w-full object-cover", imageClassName)}
        width={pixelSize}
        height={pixelSize}
        sizes={`${pixelSize}px`}
        responsiveWidths={[pixelSize, pixelSize * 2]}
        loading={loading}
        fallback={fallback}
      />
    </span>
  )
}

function getInitialColorStyle(value: string) {
  let hash = 0

  for (const character of value.toLocaleLowerCase()) {
    hash = Math.imul(hash, 31) + (character.codePointAt(0) ?? 0)
  }

  return INITIAL_COLOR_STYLES[Math.abs(hash) % INITIAL_COLOR_STYLES.length]
}
