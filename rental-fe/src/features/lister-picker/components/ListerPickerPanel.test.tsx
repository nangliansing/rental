import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"

import type { SearchAgentProfile } from "@/features/agent"

import { ListerPickerPanel } from "./ListerPickerPanel"

const searchState = vi.hoisted(() => ({
  listers: [] as SearchAgentProfile[],
  isLoading: false,
  isError: false,
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: vi.fn(),
  refetch: vi.fn(),
}))

vi.mock("../hooks/useListerPickerSearch", () => ({
  useListerPickerSearch: () => searchState,
}))

vi.mock("@/features/agent", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/agent")>()
  return {
    ...actual,
    ListerAutocomplete: ({
      onInputValueChange,
      onToggleLister,
    }: {
      onInputValueChange?: (value: string) => void
      onToggleLister: (lister: SearchAgentProfile) => void
    }) => (
      <div>
        <input
          aria-label="Search lister name"
          onChange={(event) => onInputValueChange?.(event.target.value)}
        />
        <button
          type="button"
          onClick={() =>
            onToggleLister({
              _id: "agent-from-autocomplete",
              displayName: "From Autocomplete",
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
            })
          }
        >
          Add from autocomplete
        </button>
      </div>
    ),
  }
})

function makeLister(
  overrides: Partial<SearchAgentProfile> = {},
): SearchAgentProfile {
  return {
    _id: "agent-1",
    displayName: "Alex Agent",
    profilePhoto: null,
    description: null,
    supportLanguages: ["English"],
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
    ...overrides,
  }
}

describe("ListerPickerPanel", () => {
  beforeEach(() => {
    searchState.listers = [
      makeLister({ _id: "agent-2", displayName: "Bella Broker" }),
    ]
    searchState.isLoading = false
    searchState.isError = false
  })

  it("stacks autocomplete, selected rail, then search results", async () => {
    const user = userEvent.setup()
    const onToggleLister = vi.fn()
    const onRemoveLister = vi.fn()

    render(
      <MemoryRouter>
        <ListerPickerPanel
          selectedListers={[makeLister()]}
          onToggleLister={onToggleLister}
          onRemoveLister={onRemoveLister}
        />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText("Search lister name"), "Be")

    expect(
      screen.getByRole("list", { name: "Selected listers" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Alex Agent")).toBeInTheDocument()
    expect(
      screen.getByRole("list", { name: "Lister search results" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Bella Broker")).toBeInTheDocument()

    await user.click(
      screen.getByRole("button", { name: "Remove Alex Agent" }),
    )
    expect(onRemoveLister).toHaveBeenCalledWith("agent-1")

    await user.click(
      screen.getByRole("button", { name: "Select Bella Broker" }),
    )
    expect(onToggleLister).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "agent-2" }),
    )
  })
})
