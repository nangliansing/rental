import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

export const listingGridCardSurfaceClassName =
  "group relative block aspect-square w-full overflow-hidden bg-slate-100 text-left"

export function ListingGridCardOverlay({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="listing-grid-card-overlay"
      className={cn(
        "absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent p-2 text-white",
        className,
      )}
    >
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function ListingGridCardPriceText({
  className,
  ...props
}: ComponentProps<"p">) {
  return (
    <p
      data-slot="listing-grid-card-price"
      className={cn("truncate text-sm font-semibold", className)}
      {...props}
    />
  )
}

export function ListingGridCardTitleText({
  className,
  ...props
}: ComponentProps<"p">) {
  return (
    <p
      data-slot="listing-grid-card-title"
      className={cn("truncate text-xs font-semibold text-white/90", className)}
      {...props}
    />
  )
}

export function ListingGridCardMetaText({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="listing-grid-card-meta"
      className={cn(
        "flex min-w-0 items-center gap-1 text-xs font-medium text-white/80",
        className,
      )}
      {...props}
    />
  )
}

export function ListingGridCardFinePrint({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="listing-grid-card-fine-print"
      className={cn(
        "flex min-w-0 items-center gap-1.5 text-[11px] font-medium leading-4 text-white/75",
        className,
      )}
      {...props}
    />
  )
}

export const listingGridCardCornerBadgeClassName =
  "inline-flex h-7 items-center truncate rounded-full border border-white/35 bg-slate-950/60 px-2 text-[11px] font-semibold leading-none text-white shadow-sm"

export const listingGridCardCornerBadgeLeftClassName =
  "absolute left-2 top-2 z-10 max-w-[calc(100%-4rem)]"

export const listingGridCardCornerBadgeRightClassName =
  "absolute right-2 top-2 z-10"

/** @deprecated Use listingGridCardCornerBadgeClassName */
export const listingGridCardBadgeClassName = listingGridCardCornerBadgeClassName

export function ListingGridCardCornerBadge({
  children,
  className,
  position = "inline",
  ariaLabel,
  title,
}: {
  children: ReactNode
  className?: string
  position?: "left" | "right" | "inline"
  ariaLabel?: string
  title?: string
}) {
  return (
    <div
      className={cn(
        listingGridCardCornerBadgeClassName,
        position === "left" && listingGridCardCornerBadgeLeftClassName,
        position === "right" && listingGridCardCornerBadgeRightClassName,
        className,
      )}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
    >
      <span className="truncate">{children}</span>
    </div>
  )
}
