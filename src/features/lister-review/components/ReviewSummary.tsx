import { ChevronDown, Star } from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"

import type { ListerReviewSummary } from "../api"
import { formatReviewTag } from "../utils/reviewFormatters"

type ReviewSummaryProps = {
  summary?: ListerReviewSummary | null
}

const ratingRows = [
  { label: "5", key: "fiveStars" },
  { label: "4", key: "fourStars" },
  { label: "3", key: "threeStars" },
  { label: "2", key: "twoStars" },
  { label: "1", key: "oneStar" },
] as const

export function ReviewSummary({ summary }: ReviewSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const reviewCount = summary?.reviewCount ?? 0

  if (!summary || reviewCount === 0) return null

  const topTags = [...summary.tagCounts]
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, 8)
  const visibleTags = isExpanded ? topTags : topTags.slice(0, 5)
  const reviewLabel = reviewCount === 1 ? "review" : "reviews"

  return (
    <section className="relative rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="pr-24">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <div className="flex items-center gap-1.5 text-slate-950">
              <span className="text-lg font-semibold">
                {summary.averageRating.toFixed(1)}
              </span>
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            </div>
            <span className="text-sm font-medium text-slate-400">·</span>
            <p className="text-sm font-semibold text-slate-500">
              {reviewCount} {reviewLabel}
            </p>
          </div>

          {visibleTags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {visibleTags.map((item) => (
                <span
                  key={item.tag}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  {formatReviewTag(item.tag)}
                  <span className="ml-1 text-slate-400">{item.count}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="absolute right-4 top-4 inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 sm:right-5 sm:top-5"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((current) => !current)}
        >
          Details
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              isExpanded && "rotate-180",
            )}
          />
        </button>
      </div>

      {isExpanded && (
        <div className="mt-5 grid gap-5 border-t border-slate-100 pt-5 md:grid-cols-[minmax(150px,0.7fr)_minmax(240px,1.3fr)] md:items-center">
          <div>
            <div className="flex items-end gap-2">
              <p className="text-4xl font-semibold tracking-normal text-slate-950">
                {summary.averageRating.toFixed(1)}
              </p>
              <p className="pb-1 text-sm font-semibold text-slate-500">/ 5</p>
            </div>
            <div className="mt-2 flex items-center gap-1 text-amber-400">
              {[1, 2, 3, 4, 5].map((value) => (
                <Star
                  key={value}
                  className={cn(
                    "h-4 w-4",
                    value <= Math.round(summary.averageRating)
                      ? "fill-current"
                      : "text-slate-200",
                  )}
                />
              ))}
            </div>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Based on {reviewCount} {reviewLabel}
            </p>
          </div>

          <div className="space-y-2">
            {ratingRows.map((row) => {
              const count = summary.ratingCounts[row.key] ?? 0
              const percentage =
                reviewCount > 0 ? (count / reviewCount) * 100 : 0

              return (
                <div
                  key={row.key}
                  className="grid grid-cols-[18px_1fr_28px] items-center gap-2 text-xs font-semibold text-slate-500"
                >
                  <span>{row.label}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-950"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
