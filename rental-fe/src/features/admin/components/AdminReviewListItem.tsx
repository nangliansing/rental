import { Clock3, ImageIcon } from "lucide-react"
import type { ReactNode } from "react"

import type { UploadedMedia } from "@/features/uploads"
import { cn } from "@/lib/utils"
import { OptimizedImage } from "@/shared/components/media/OptimizedImage"

import { AdminStatusBadge, type AdminStatusBadgeStatus } from "./AdminStatusBadge"

export function AdminReviewListItem({
  title,
  meta,
  createdAt,
  isSelected,
  onSelect,
  image,
  imageAlt,
  imageBadge,
  imageFallback,
  rightText,
  status,
  note,
  imageSize = "md",
}: {
  title: string
  meta: string[]
  createdAt: string
  isSelected: boolean
  onSelect: () => void
  image?: UploadedMedia | null
  imageAlt?: string
  imageBadge?: string
  imageFallback?: ReactNode
  rightText?: string
  status?: AdminStatusBadgeStatus
  note?: string | null
  imageSize?: "sm" | "md"
}) {
  const hasImageColumn = imageSize === "md" || image || imageFallback
  const gridClass = hasImageColumn
    ? imageSize === "sm"
      ? "grid-cols-[76px_1fr]"
      : "grid-cols-[92px_1fr]"
    : "grid-cols-1 p-3"

  return (
    <button
      type="button"
      className={cn(
        "grid w-full gap-3 rounded-lg border p-2 text-left transition",
        gridClass,
        isSelected
          ? "border-slate-950 bg-slate-50"
          : "border-slate-200 bg-white hover:bg-slate-50",
      )}
      onClick={onSelect}
    >
      {hasImageColumn && (
        <div className="relative aspect-square overflow-hidden rounded-md bg-slate-100">
          {image ? (
            <OptimizedImage
              src={image.secureUrl}
              alt={imageAlt ?? title}
              className="h-full w-full object-cover"
              width={184}
              height={184}
              sizes={imageSize === "sm" ? "76px" : "92px"}
              responsiveWidths={[92, 184]}
              fallback={
                <div className="flex h-full items-center justify-center text-slate-400">
                  {imageFallback ?? <ImageIcon aria-hidden="true" className="h-6 w-6" />}
                </div>
              }
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              {imageFallback ?? <ImageIcon className="h-6 w-6" />}
            </div>
          )}
          {imageBadge && (
            <span className="absolute bottom-1 left-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-800">
              {imageBadge}
            </span>
          )}
        </div>
      )}

      <div className="min-w-0 py-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-950">
            {title}
          </p>
          {status ? (
            <AdminStatusBadge status={status} />
          ) : (
            rightText && (
              <span className="shrink-0 text-sm font-semibold text-slate-950">
                {rightText}
              </span>
            )
          )}
        </div>

        {meta.map((line) => (
          <p key={line} className="mt-1 truncate text-xs text-slate-500">
            {line}
          </p>
        ))}

        <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
          <Clock3 className="h-3.5 w-3.5" />
          <span className="truncate">{createdAt}</span>
        </div>

        {note && (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
            {note}
          </p>
        )}
      </div>
    </button>
  )
}
