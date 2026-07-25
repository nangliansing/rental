import { MapPin } from "lucide-react"

import type { PlacePrediction } from "../../hooks/usePlaceSearch"
import { MIN_SEARCH_QUERY_LENGTH } from "./search.constants"
import { TypeaheadStatus } from "./TypeaheadStatus"

type PlaceSuggestionListProps = {
  predictions: PlacePrediction[]
  error?: string | null
  query: string
  isLoading?: boolean
  activeIndex?: number
  optionIdPrefix?: string
  onRetry?: () => void
  onSelect: (prediction: PlacePrediction) => void
}

export function PlaceSuggestionList({
  predictions,
  error = null,
  query,
  isLoading = false,
  activeIndex = -1,
  optionIdPrefix = "place-option",
  onRetry,
  onSelect,
}: PlaceSuggestionListProps) {
  if (query.trim().length < MIN_SEARCH_QUERY_LENGTH) {
    return (
      <TypeaheadStatus>
        Type at least {MIN_SEARCH_QUERY_LENGTH} characters to find a place.
      </TypeaheadStatus>
    )
  }

  if (isLoading) {
    return (
      <TypeaheadStatus>Searching places...</TypeaheadStatus>
    )
  }

  if (error) {
    return (
      <div
        className="px-3 py-6 text-center text-sm text-slate-600"
        role="alert"
      >
        <p>{error}</p>
        {onRetry && (
          <button
            type="button"
            className="mt-2 font-medium text-slate-950 underline underline-offset-4"
            onClick={onRetry}
          >
            Try again
          </button>
        )}
      </div>
    )
  }

  if (predictions.length === 0) {
    return (
      <TypeaheadStatus>No places found.</TypeaheadStatus>
    )
  }

  return (
    <div className="space-y-1">
      <TypeaheadStatus visuallyHidden>
        {predictions.length} {predictions.length === 1 ? "place" : "places"}{" "}
        found.
      </TypeaheadStatus>
      {predictions.map((prediction, index) => (
        <button
          key={`${prediction.id || prediction.text}-${index}`}
          type="button"
          id={`${optionIdPrefix}-${index}`}
          role="option"
          aria-selected={activeIndex === index}
          className="flex w-full items-center gap-3 rounded-lg bg-white px-3 py-3 text-left text-sm text-slate-950 hover:bg-slate-100"
          onClick={() => onSelect(prediction)}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
            <MapPin className="h-4 w-4 text-slate-500" />
          </span>

          <span className="min-w-0 truncate font-medium">
            {prediction.text}
          </span>
        </button>
      ))}
    </div>
  )
}
