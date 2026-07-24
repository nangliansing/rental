import { SquarePen } from "lucide-react"
import { useState } from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { getReviewTagDetails } from "./review-tag-details"

type ReviewTagCount = {
  tag?: unknown
  count?: unknown
}

export type ReviewTagBadgesProps = {
  tagCounts?: ReviewTagCount[] | null
  maxTags?: number
  className?: string
  onReviewsClick?: () => void
}

type RankedReviewTag = {
  tag: string
  label: string
  description: string
  count: number
}

const DEFAULT_MAX_TAGS = 2
const REVIEW_BADGE_STAGGER_SECONDS = 1.3
const REVIEW_BADGE_CLASS_NAME =
  "review-tag-float rounded-full border border-white/15 bg-black/65 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90"

function getTopReviewTags(
  tagCounts: ReviewTagBadgesProps["tagCounts"],
  maxTags: number,
) {
  if (!Array.isArray(tagCounts) || maxTags <= 0) return []

  const countsByTag = new Map<string, RankedReviewTag>()

  for (const item of tagCounts) {
    const details = getReviewTagDetails(item?.tag)
    const tag = typeof item?.tag === "string" ? item.tag.trim().toUpperCase() : ""
    const count = typeof item?.count === "number" ? item.count : Number.NaN

    if (!details || !tag || !Number.isFinite(count) || count <= 0) continue

    const normalizedCount = Math.trunc(count)
    if (normalizedCount <= 0) continue

    const existing = countsByTag.get(tag)
    countsByTag.set(tag, {
      tag,
      ...details,
      count: (existing?.count ?? 0) + normalizedCount,
    })
  }

  return [...countsByTag.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, maxTags)
}

export function ReviewTagBadges({
  tagCounts,
  maxTags = DEFAULT_MAX_TAGS,
  className,
  onReviewsClick,
}: ReviewTagBadgesProps) {
  const normalizedMaxTags = Number.isFinite(maxTags)
    ? Math.max(0, Math.trunc(maxTags))
    : DEFAULT_MAX_TAGS
  const tags = getTopReviewTags(tagCounts, normalizedMaxTags)

  if (tags.length === 0 && !onReviewsClick) return null

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex max-w-full flex-wrap items-center gap-1.5",
          className,
        )}
        aria-label="Lister review highlights and actions"
      >
        {onReviewsClick && (
          <ReviewActionBadge onClick={onReviewsClick} />
        )}
        {tags.map((tag, index) => (
          <ReviewTagBadge
            key={tag.tag}
            tag={tag}
            index={index + (onReviewsClick ? 1 : 0)}
            onReviewsClick={onReviewsClick}
          />
        ))}
      </div>
    </TooltipProvider>
  )
}

function ReviewTagBadge({
  tag,
  index,
  onReviewsClick,
}: {
  tag: RankedReviewTag
  index: number
  onReviewsClick?: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const reviewLabel = tag.count === 1 ? "review" : "reviews"

  return (
    <Tooltip open={isOpen} onOpenChange={setIsOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            REVIEW_BADGE_CLASS_NAME,
            "max-w-48 truncate px-2.5 py-1 text-xs font-semibold",
          )}
          style={{
            animationDelay: `${index * -REVIEW_BADGE_STAGGER_SECONDS}s`,
          }}
          aria-label={`${tag.label}, mentioned in ${tag.count} ${reviewLabel}${onReviewsClick ? ". Open lister reviews" : ""}`}
          onClick={() => {
            if (!onReviewsClick) return

            setIsOpen(false)
            onReviewsClick()
          }}
          onPointerDown={(event) => {
            if (!onReviewsClick && event.pointerType === "touch") {
              setIsOpen((current) => !current)
            }
          }}
        >
          {tag.label}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" align="start">
        <p>{tag.description}</p>
        <p className="mt-0.5 text-white/65">
          Mentioned in {tag.count} {reviewLabel}.
        </p>
      </TooltipContent>
    </Tooltip>
  )
}

function ReviewActionBadge({ onClick }: { onClick: () => void }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Tooltip open={isOpen} onOpenChange={setIsOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            REVIEW_BADGE_CLASS_NAME,
            "flex h-7 w-7 shrink-0 items-center justify-center",
          )}
          aria-label="Open lister reviews"
          onClick={() => {
            setIsOpen(false)
            onClick()
          }}
        >
          <SquarePen aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" align="start">
        Read feedback or write a review for this lister.
      </TooltipContent>
    </Tooltip>
  )
}
