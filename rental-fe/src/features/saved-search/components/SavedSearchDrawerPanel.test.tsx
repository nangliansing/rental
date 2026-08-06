import type { ReactNode } from "react"
import { createRef } from "react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { SavedSearch } from "@/features/saved-search/api"

import { SavedSearchDrawerPanel } from "./SavedSearchDrawerPanel"

const mockUseSearchOwnerSavedSearches = vi.hoisted(() => vi.fn())

vi.mock("@/features/saved-search/api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/saved-search/api")>()

  return {
    ...actual,
    useSearchOwnerSavedSearches: mockUseSearchOwnerSavedSearches,
    useUpdateOwnerSavedSearchStatus: () => ({
      mutate: vi.fn(),
      isPending: false,
    }),
    useDeleteOwnerSavedSearch: () => ({
      mutate: vi.fn(),
      isPending: false,
    }),
    useUpdateOwnerSavedSearch: () => ({
      mutate: vi.fn(),
      isPending: false,
      error: null,
      reset: vi.fn(),
    }),
  }
})

vi.mock("@/shared/components/ModalPortal", () => ({
  ModalPortal: ({ children }: { children: ReactNode }) => (
    <div data-testid="modal-portal">{children}</div>
  ),
}))

vi.mock("@/shared/google-maps/readonly-map", () => ({
  ReadOnlyMap: () => <div data-testid="readonly-map" />,
  searchLinesGeometryToPaths: () => null,
}))

vi.mock("./SavedSearchMatchingBuildingsSection", () => ({
  SavedSearchMatchingBuildingsSection: () => (
    <div data-testid="matching-buildings">Matching buildings</div>
  ),
}))

function makeSavedSearch(
  overrides: Partial<SavedSearch> = {},
): SavedSearch {
  return {
    _id: "cr-1",
    createdBy: "user-1",
    name: "Sukhumvit 2BR",
    description: "Near BTS",
    status: "Waiting",
    geoSearch: {
      mode: "area",
      placeName: "Phrom Phong",
    },
    filters: {},
    isDeleted: false,
    deletedAt: null,
    createdAt: "2026-08-03T18:00:00.000Z",
    updatedAt: "2026-08-03T18:00:00.000Z",
    ...overrides,
  }
}

function mockQuery(overrides: Record<string, unknown> = {}) {
  mockUseSearchOwnerSavedSearches.mockReturnValue({
    isPending: false,
    error: null,
    data: { pages: [] },
    hasNextPage: false,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    refetch: vi.fn(),
    fetchNextPage: vi.fn(),
    ...overrides,
  })
}

describe("SavedSearchDrawerPanel", () => {
  beforeEach(() => {
    mockQuery()
  })

  it("lists waiting requests and opens detail modal on row select", async () => {
    const user = userEvent.setup()
    const request = makeSavedSearch()
    mockQuery({ data: { pages: [{ data: [request] }] } })
    const scrollRootRef = createRef<HTMLDivElement>()

    render(
      <div ref={scrollRootRef}>
        <SavedSearchDrawerPanel scrollRootRef={scrollRootRef} />
      </div>,
    )

    expect(mockUseSearchOwnerSavedSearches).toHaveBeenCalledWith({
      status: "Waiting",
      enabled: true,
    })

    await user.click(screen.getByRole("button", { name: /Sukhumvit 2BR/i }))

    const dialog = await screen.findByRole("dialog", { name: "Sukhumvit 2BR" })
    expect(
      within(dialog).getByRole("heading", { name: "Sukhumvit 2BR" }),
    ).toBeInTheDocument()
    expect(within(dialog).getByText("Saved search")).toBeInTheDocument()
  })

  it("does not add page scroll padding in drawer layout", () => {
    mockQuery({ data: { pages: [{ data: [makeSavedSearch()] }] } })
    const scrollRootRef = createRef<HTMLDivElement>()

    render(<SavedSearchDrawerPanel scrollRootRef={scrollRootRef} />)

    expect(
      screen.getByTestId("saved-search-list-scroller").className,
    ).not.toContain("pb-20")
  })

  it("closes the detail modal from the header button", async () => {
    const user = userEvent.setup()
    mockQuery({
      data: { pages: [{ data: [makeSavedSearch()] }] },
    })
    const scrollRootRef = createRef<HTMLDivElement>()

    render(<SavedSearchDrawerPanel scrollRootRef={scrollRootRef} />)

    await user.click(screen.getByRole("button", { name: /Sukhumvit 2BR/i }))
    expect(
      await screen.findByRole("dialog", { name: "Sukhumvit 2BR" }),
    ).toBeInTheDocument()

    await user.click(
      screen.getAllByRole("button", {
        name: "Close saved search details",
      })[0]!,
    )

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })
})
