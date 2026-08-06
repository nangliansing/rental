import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { SavedSearch } from "@/features/saved-search/api"

import { SavedSearchDetailPane } from "./SavedSearchDetailPane"

const closeMutate = vi.hoisted(() => vi.fn())
const deleteMutate = vi.hoisted(() => vi.fn())

vi.mock("@/features/saved-search/api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/saved-search/api")>()

  return {
    ...actual,
    useUpdateOwnerSavedSearchStatus: () => ({
      mutate: closeMutate,
      isPending: false,
    }),
    useDeleteOwnerSavedSearch: () => ({
      mutate: deleteMutate,
      isPending: false,
    }),
  }
})

vi.mock("@/shared/google-maps/readonly-map", () => ({
  ReadOnlyMap: () => <div data-testid="readonly-map" />,
  searchLinesGeometryToPaths: () => null,
}))

vi.mock("./SavedSearchDetailActionsMenu", () => ({
  SavedSearchDetailActionsMenu: ({
    status,
    onEditRequest,
    onCloseRequest,
    onDeleteRequest,
  }: {
    status: string
    onEditRequest: () => void
    onCloseRequest: () => void
    onDeleteRequest: () => void
  }) => (
    <div>
      <button type="button" onClick={onEditRequest}>
        Edit
      </button>
      <button type="button" onClick={onCloseRequest}>
        {status === "Closed" ? "Closed" : "Close"}
      </button>
      <button type="button" onClick={onDeleteRequest}>
        Delete
      </button>
    </div>
  ),
}))

vi.mock("./ConfirmEditSavedSearchModal", () => ({
  ConfirmEditSavedSearchModal: ({
    isOpen,
    savedSearch,
  }: {
    isOpen: boolean
    savedSearch: { name: string } | null
  }) =>
    isOpen && savedSearch ? (
      <div role="dialog" aria-label="Edit saved search">
        Editing {savedSearch.name}
      </div>
    ) : null,
}))

vi.mock("./SavedSearchMatchingBuildingsSection", () => ({
  SavedSearchMatchingBuildingsSection: () => (
    <div data-testid="matching-buildings">Matching buildings</div>
  ),
}))

vi.mock("./SavedSearchDetailListersSection", () => ({
  SavedSearchDetailListersSection: () => (
    <div data-testid="preferred-listers">Preferred listers</div>
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
      mode: "nearby",
      placeName: "Asok",
      position: { lat: 13.736, lng: 100.56 },
      radiusMeters: 1000,
    },
    filters: {
      bedroomCount: 2,
      minRent: 20_000,
    },
    isDeleted: false,
    deletedAt: null,
    createdAt: "2026-08-03T18:00:00.000Z",
    updatedAt: "2026-08-03T18:00:00.000Z",
    ...overrides,
  }
}

describe("SavedSearchDetailPane", () => {
  beforeEach(() => {
    closeMutate.mockReset()
    deleteMutate.mockReset()
  })

  it("shows the empty placeholder when nothing is selected", () => {
    render(<SavedSearchDetailPane selected={null} />)

    expect(
      screen.getByRole("heading", { name: "Select a saved search" }),
    ).toBeInTheDocument()
  })

  it("renders name, status, location open, and preferences closed", () => {
    render(<SavedSearchDetailPane selected={makeSavedSearch()} />)

    expect(
      screen.getByRole("heading", { name: "Sukhumvit 2BR" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Active")).toBeInTheDocument()
    expect(screen.getByText("Near BTS")).toBeInTheDocument()
    expect(screen.getByTestId("readonly-map")).toBeInTheDocument()
    expect(screen.getByText("Asok")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Search area/i }),
    ).toHaveAttribute("aria-expanded", "true")
    expect(
      screen.getByRole("button", { name: /Preferences/i }),
    ).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByText("2 filters")).toBeInTheDocument()
    expect(screen.queryByText(/2\+ beds/i)).not.toBeInTheDocument()
    expect(screen.getByTestId("preferred-listers")).toBeInTheDocument()
    expect(screen.getByTestId("matching-buildings")).toBeInTheDocument()
  })

  it("closes a waiting request and notifies the parent", async () => {
    const user = userEvent.setup()
    const onRequestRemoved = vi.fn()
    closeMutate.mockImplementation((_vars, options) => {
      options?.onSuccess?.()
    })

    render(
      <SavedSearchDetailPane
        selected={makeSavedSearch()}
        onRequestRemoved={onRequestRemoved}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Close" }))

    expect(closeMutate).toHaveBeenCalledWith(
      { savedSearchId: "cr-1", status: "Closed" },
      expect.any(Object),
    )
    expect(onRequestRemoved).toHaveBeenCalledWith("cr-1")
  })

  it("opens a confirmation dialog before deleting", async () => {
    const user = userEvent.setup()
    const onRequestRemoved = vi.fn()
    deleteMutate.mockImplementation((_vars, options) => {
      options?.onSuccess?.()
    })

    render(
      <SavedSearchDetailPane
        selected={makeSavedSearch()}
        onRequestRemoved={onRequestRemoved}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Delete" }))

    expect(
      screen.getByRole("heading", { name: "Delete this saved search?" }),
    ).toBeInTheDocument()

    const confirmButtons = screen.getAllByRole("button", { name: "Delete" })
    await user.click(confirmButtons[confirmButtons.length - 1]!)

    await waitFor(() => {
      expect(deleteMutate).toHaveBeenCalledWith(
        { savedSearchId: "cr-1" },
        expect.any(Object),
      )
    })
    expect(onRequestRemoved).toHaveBeenCalledWith("cr-1")
  })

  it("opens the edit modal for a waiting request", async () => {
    const user = userEvent.setup()

    render(<SavedSearchDetailPane selected={makeSavedSearch()} />)

    await user.click(screen.getByRole("button", { name: "Edit" }))

    expect(
      screen.getByRole("dialog", { name: "Edit saved search" }),
    ).toHaveTextContent("Editing Sukhumvit 2BR")
  })
})
