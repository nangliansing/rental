import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { PlaceSuggestionList } from "./PlaceSuggestionList"

describe("PlaceSuggestionList", () => {
  it("shows an accessible Google error and retries on request", () => {
    const onRetry = vi.fn()

    render(
      <PlaceSuggestionList
        predictions={[]}
        query="Bangkok"
        error="Place search is unavailable. Try again."
        onRetry={onRetry}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Place search is unavailable. Try again.",
    )
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("politely announces loading and result counts", () => {
    const { rerender } = render(
      <PlaceSuggestionList
        predictions={[]}
        query="Bangkok"
        isLoading
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByRole("status")).toHaveTextContent(
      "Searching places...",
    )
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite")
    expect(screen.getByRole("status")).toHaveAttribute("aria-atomic", "true")

    rerender(
      <PlaceSuggestionList
        predictions={[
          {
            id: "bangkok",
            text: "Bangkok",
            prediction: {} as google.maps.places.PlacePrediction,
          },
        ]}
        query="Bangkok"
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByRole("status")).toHaveTextContent("1 place found.")
  })
})
