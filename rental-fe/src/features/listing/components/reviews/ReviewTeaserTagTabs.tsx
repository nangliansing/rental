import { formatReviewTag } from "@/features/lister-review/utils/reviewFormatters"

import {
  DEFAULT_TOP_REVIEW_TAG_LIMIT,
  getTopReviewTags,
  type ReviewTagCountLike,
} from "../../utils/getTopReviewTags"

type ReviewTeaserTagTabsProps = {
  tagCounts?: readonly ReviewTagCountLike[] | null
  maxTags?: number
}

/**
 * Compact top-tag pills shown between the card header and the review teaser.
 */
export function ReviewTeaserTagTabs({
  tagCounts,
  maxTags = DEFAULT_TOP_REVIEW_TAG_LIMIT,
}: ReviewTeaserTagTabsProps) {
  const tags = getTopReviewTags(tagCounts, maxTags)
  if (tags.length === 0) return null

  return (
    <ul
      className="flex flex-wrap gap-1.5 px-4"
      aria-label="Top review tags"
    >
      {tags.map((item) => (
        <li
          key={item.tag}
          className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200/90"
        >
          {formatReviewTag(item.tag)}
          <span className="ml-1 font-medium text-slate-400">{item.count}</span>
        </li>
      ))}
    </ul>
  )
}
