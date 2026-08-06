import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"

import { ListerAutocomplete } from "./ListerAutocomplete"

const typeaheadState = vi.hoisted(() => ({
  query: "",
  results: [] as Array<{
    _id: string
    displayName: string
    profilePhoto: null
    description: null
    supportLanguages: string[]
    reviewSummary: {
      averageRating: number
      reviewCount: number
      ratingCounts: Record<1 | 2 | 3 | 4 | 5, number>
    }
    isVerified: boolean
    isOnline: boolean
    createdAt: string
    updatedAt: string
  }>,
  error: null as string | null,
  isLoading: false,
  setQuery: vi.fn(),
  clearError: vi.fn(),
  clearResults: vi.fn(),
  cancelRequest: vi.fn(),
  stopSearch: vi.fn(),
  search: vi.fn(),
}))

vi.mock("@/features/agent/hooks/useAgentTypeahead", () => ({
  useAgentTypeahead: () => typeaheadState,
}))

vi.mock("use-debounce", () => ({
  useDebouncedCallback: (fn: (value: string) => void) => {
    const wrapped = Object.assign((value: string) => fn(value), {
      cancel: vi.fn(),
    })
    return wrapped
  },
}))

function renderAutocomplete(
  overrides: Partial<Parameters<typeof ListerAutocomplete>[0]> = {},
) {
  const onToggleLister = overrides.onToggleLister ?? vi.fn()

  return {
    onToggleLister,
    ...render(
      <MemoryRouter>
        <ListerAutocomplete onToggleLister={onToggleLister} {...overrides} />
      </MemoryRouter>,
    ),
  }
}

describe("ListerAutocomplete", () => {
  beforeEach(() => {
    typeaheadState.query = ""
    typeaheadState.results = []
    typeaheadState.error = null
    typeaheadState.isLoading = false
    typeaheadState.search.mockReset()
    typeaheadState.clearError.mockReset()
    typeaheadState.clearResults.mockReset()
    typeaheadState.cancelRequest.mockReset()
    typeaheadState.stopSearch.mockReset()
  })

  it("debounces search and toggles a selected lister", async () => {
    const user = userEvent.setup()
    typeaheadState.query = "Al"
    typeaheadState.results = [
      {
        _id: "agent-1",
        displayName: "Alex Agent",
        profilePhoto: null,
        description: null,
        supportLanguages: ["English"],
        reviewSummary: {
          averageRating: 0,
          reviewCount: 0,
          ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
        isVerified: false,
        isOnline: false,
        createdAt: "",
        updatedAt: "",
      },
    ]

    const { onToggleLister, rerender } = renderAutocomplete()

    await user.type(
      screen.getByRole("combobox", { name: "Search lister name" }),
      "Al",
    )

    expect(typeaheadState.search).toHaveBeenCalledWith("Al")

    rerender(
      <MemoryRouter>
        <ListerAutocomplete onToggleLister={onToggleLister} />
      </MemoryRouter>,
    )

    expect(screen.getByText("Alex Agent")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Select Alex Agent" }))
    expect(onToggleLister).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "agent-1" }),
    )
  })

  it("does not search until the minimum query length is met", async () => {
    const user = userEvent.setup()
    renderAutocomplete()

    await user.type(
      screen.getByRole("combobox", { name: "Search lister name" }),
      "A",
    )

    expect(typeaheadState.search).not.toHaveBeenCalled()
    expect(typeaheadState.stopSearch).toHaveBeenCalled()
    expect(
      screen.getByText(/Type at least 2 characters/i),
    ).toBeInTheDocument()
  })

  it("hides suggestions and skips typeahead when showSuggestions is false", async () => {
    const user = userEvent.setup()
    const onInputValueChange = vi.fn()

    renderAutocomplete({
      showSuggestions: false,
      onInputValueChange,
    })

    await user.type(
      screen.getByRole("searchbox", { name: "Search lister name" }),
      "Al",
    )

    expect(onInputValueChange).toHaveBeenCalled()
    expect(typeaheadState.search).not.toHaveBeenCalled()
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    expect(
      screen.queryByText(/Type at least 2 characters/i),
    ).not.toBeInTheDocument()
  })
})
