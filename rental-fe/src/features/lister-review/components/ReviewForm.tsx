import { useMemo, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Textarea } from "@/components/ui/textarea"
import { MultiOptionSelector } from "@/shared/components/inputs/MultiOptionSelector"
import { RatingSelector } from "@/shared/components/inputs/RatingSelector"

import type { ListerReview, ListerReviewTag } from "../api"

const COMMENT_MAX_LENGTH = 1200

const REVIEW_TAG_OPTIONS: {
  id: ListerReviewTag
  label: string
}[] = [
  { id: "RESPONSIVE", label: "Responsive" },
  { id: "HELPFUL", label: "Helpful" },
  { id: "ACCURATE_INFO", label: "Accurate info" },
  { id: "FRIENDLY", label: "Friendly" },
  { id: "CLEAR_COMMUNICATION", label: "Clear communication" },
  { id: "FAST_FOLLOW_UP", label: "Fast follow-up" },
  { id: "UNRESPONSIVE", label: "Unresponsive" },
  { id: "INACCURATE_INFO", label: "Inaccurate info" },
  { id: "RUDE", label: "Rude" },
  { id: "SUSPICIOUS", label: "Suspicious" },
  { id: "PRESSURE_TACTICS", label: "Pressure tactics" },
]

const REVIEW_TAG_SELECTOR_OPTIONS = REVIEW_TAG_OPTIONS.map((tag) => ({
  label: tag.label,
  value: tag.id,
}))
const REVIEW_TAG_VALUES = new Set(REVIEW_TAG_OPTIONS.map((tag) => tag.id))

export type ReviewFormValues = {
  rating: number
  tags: ListerReviewTag[]
  comment: string | null
}

type ReviewFormProps = {
  mode: "create" | "edit"
  initialReview: ListerReview | null
  isSubmitting: boolean
  errorMessage: string
  onSubmit: (values: ReviewFormValues) => void
}

export function ReviewForm({
  mode,
  initialReview,
  isSubmitting,
  errorMessage,
  onSubmit,
}: ReviewFormProps) {
  const initialValues = useMemo(
    () => getInitialReviewFormValues(initialReview),
    [initialReview],
  )
  const [rating, setRating] = useState(initialValues.rating)
  const [tags, setTags] = useState<ListerReviewTag[]>(initialValues.tags)
  const [comment, setComment] = useState(initialValues.comment ?? "")
  const currentValues = useMemo<ReviewFormValues>(
    () => ({
      rating,
      tags,
      comment: comment.trim() || null,
    }),
    [comment, rating, tags],
  )
  const hasChanges =
    mode === "create" || !areReviewFormValuesEqual(currentValues, initialValues)
  const submitLabel = mode === "edit" ? "Save review" : "Post review"
  const commentCharactersLeft = COMMENT_MAX_LENGTH - comment.length
  const normalizedErrorMessage =
    typeof errorMessage === "string" ? errorMessage.trim() : ""

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSubmitting || !hasChanges) return

    onSubmit(currentValues)
  }

  return (
    <form className="space-y-6 p-5" onSubmit={handleSubmit}>
      <RatingSelector
        label="Rating"
        value={rating}
        disabled={isSubmitting}
        onChange={setRating}
      />

      <MultiOptionSelector
        label="Tags"
        options={REVIEW_TAG_SELECTOR_OPTIONS}
        value={tags}
        disabled={isSubmitting}
        onChange={(nextTags) => setTags((nextTags ?? []) as ListerReviewTag[])}
      />

      <FormField
        label={
          <span className="flex items-center justify-between gap-3">
            <span>Comment</span>
            <span
              className="text-xs font-medium text-slate-400"
              aria-live="polite"
            >
              {commentCharactersLeft} characters left
            </span>
          </span>
        }
        error={normalizedErrorMessage}
      >
        <Textarea
          value={comment}
          rows={6}
          maxLength={COMMENT_MAX_LENGTH}
          disabled={isSubmitting}
          className="min-h-36 resize-none leading-6"
          placeholder={
            mode === "edit"
              ? "Update your review..."
              : "Write a clear, helpful review..."
          }
          onChange={(event) => setComment(event.target.value)}
        />
      </FormField>

      <Button
        type="submit"
        className="h-11 w-full rounded-full"
        disabled={isSubmitting || !hasChanges}
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  )
}

function getInitialReviewFormValues(
  review: ListerReview | null,
): ReviewFormValues {
  const rating = review?.rating
  const tags = Array.isArray(review?.tags)
    ? review.tags.filter((tag): tag is ListerReviewTag =>
        REVIEW_TAG_VALUES.has(tag as ListerReviewTag),
      )
    : []

  return {
    rating:
      typeof rating === "number" &&
      Number.isInteger(rating) &&
      rating >= 1 &&
      rating <= 5
        ? rating
        : 5,
    tags,
    comment: typeof review?.comment === "string" ? review.comment : null,
  }
}

function areReviewFormValuesEqual(
  left: ReviewFormValues,
  right: ReviewFormValues,
) {
  if (left.rating !== right.rating) return false
  if ((left.comment ?? null) !== (right.comment ?? null)) return false

  const leftTags = Array.isArray(left.tags) ? [...left.tags].sort() : []
  const rightTags = Array.isArray(right.tags) ? [...right.tags].sort() : []

  if (leftTags.length !== rightTags.length) return false

  return leftTags.every((tag, index) => tag === rightTags[index])
}
