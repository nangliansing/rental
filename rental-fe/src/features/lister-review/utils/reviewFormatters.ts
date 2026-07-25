import type { ListerReviewTag } from "../api"

export function formatReviewTag(tag: ListerReviewTag) {
  return tag
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
