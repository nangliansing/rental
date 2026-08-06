import { createRef } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
  formatMobileListerOverlayDismissLabel,
  MobilePlaceSearchOverlay,
} from "./MobilePlaceSearchOverlay"

vi.mock("../../context/MapSearchSessionContext", () => ({
  useMapSearchPlace: () => ({
    currentAgentProfileId: null,
  }),
}))

const emptySelected = {
  selectedListers: [] as never[],
  selectedListerIds: [] as string[],
}

describe("formatMobileListerOverlayDismissLabel", () => {
  it("uses Done with no selection and count-aware add labels otherwise", () => {
    expect(formatMobileListerOverlayDismissLabel(0)).toBe("Done")
    expect(formatMobileListerOverlayDismissLabel(1)).toBe(
      "Add 1 lister to filters",
    )
    expect(formatMobileListerOverlayDismissLabel(3)).toBe(
      "Add 3 listers to filters",
    )
  })
})

describe("MobilePlaceSearchOverlay", () => {
  it("shows a full-width dismiss CTA on the listers tab", () => {
    const onClose = vi.fn()

    render(
      <MobilePlaceSearchOverlay
        inputRef={createRef<HTMLInputElement>()}
        searchMode="listers"
        predictions={[]}
        placeQuery=""
        placeSearchError={null}
        isPlaceSearchLoading={false}
        listers={[]}
        listerQuery=""
        listerSearchError={null}
        isListerSearchLoading={false}
        {...emptySelected}
        onClose={onClose}
        onInputChange={vi.fn()}
        onSearch={vi.fn()}
        onSearchModeChange={vi.fn()}
        onRetryPlaceSearch={vi.fn()}
        onRetryListerSearch={vi.fn()}
        onSelectSuggestion={vi.fn()}
        onToggleLister={vi.fn()}
        onRemoveLister={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Done" }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("labels the CTA with the selected lister count", () => {
    render(
      <MobilePlaceSearchOverlay
        inputRef={createRef<HTMLInputElement>()}
        searchMode="listers"
        predictions={[]}
        placeQuery=""
        placeSearchError={null}
        isPlaceSearchLoading={false}
        listers={[]}
        listerQuery=""
        listerSearchError={null}
        isListerSearchLoading={false}
        selectedListers={[
          {
            _id: "agent-1",
            displayName: "Kim Lay",
            profilePhoto: null,
            description: null,
            supportLanguages: [],
            reviewSummary: {
              averageRating: 0,
              reviewCount: 0,
              ratingCounts: {
                oneStar: 0,
                twoStars: 0,
                threeStars: 0,
                fourStars: 0,
                fiveStars: 0,
              },
              tagCounts: [],
            },
            isVerified: false,
            isOnline: false,
            createdAt: "",
            updatedAt: "",
          },
        ]}
        selectedListerIds={["agent-1"]}
        onClose={vi.fn()}
        onInputChange={vi.fn()}
        onSearch={vi.fn()}
        onSearchModeChange={vi.fn()}
        onRetryPlaceSearch={vi.fn()}
        onRetryListerSearch={vi.fn()}
        onSelectSuggestion={vi.fn()}
        onToggleLister={vi.fn()}
        onRemoveLister={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("button", { name: "Add 1 lister to filters" }),
    ).toBeInTheDocument()
  })

  it("hides the CTA on the places tab", () => {
    render(
      <MobilePlaceSearchOverlay
        inputRef={createRef<HTMLInputElement>()}
        searchMode="places"
        predictions={[]}
        placeQuery=""
        placeSearchError={null}
        isPlaceSearchLoading={false}
        listers={[]}
        listerQuery=""
        listerSearchError={null}
        isListerSearchLoading={false}
        {...emptySelected}
        onClose={vi.fn()}
        onInputChange={vi.fn()}
        onSearch={vi.fn()}
        onSearchModeChange={vi.fn()}
        onRetryPlaceSearch={vi.fn()}
        onRetryListerSearch={vi.fn()}
        onSelectSuggestion={vi.fn()}
        onToggleLister={vi.fn()}
        onRemoveLister={vi.fn()}
      />,
    )

    expect(screen.queryByRole("button", { name: "Done" })).not.toBeInTheDocument()
  })
})
