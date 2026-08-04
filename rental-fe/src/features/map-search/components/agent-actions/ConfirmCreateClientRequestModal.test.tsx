import type { ReactNode } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ConfirmCreateClientRequestModal } from "./ConfirmCreateClientRequestModal"

const mutate = vi.hoisted(() => vi.fn())
const reset = vi.hoisted(() => vi.fn())
const toast = vi.hoisted(() => vi.fn())
const createState = vi.hoisted(() => ({
  isPending: false,
  error: null as Error | null,
}))

vi.mock("@/features/client-request/api", () => ({
  CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH: 2_000,
  CLIENT_REQUEST_NAME_MAX_LENGTH: 120,
  useCreateOwnerClientRequest: () => ({
    mutate,
    get isPending() {
      return createState.isPending
    },
    get error() {
      return createState.error
    },
    reset,
  }),
}))

vi.mock("@/hooks/use-toast", () => ({ toast }))
vi.mock("@/shared/google-maps/readonly-map", () => ({
  ReadOnlyMap: () => <div data-testid="readonly-map" />,
}))
vi.mock("@/shared/components/dialogs/DialogShell", () => ({
  DialogShell: ({
    children,
    isOpen,
    isDismissDisabled,
    onDismiss,
  }: {
    children: ReactNode
    isOpen: boolean
    isDismissDisabled?: boolean
    onDismiss?: () => void
  }) =>
    isOpen ? (
      <div role="presentation" data-testid="dialog-shell">
        <button
          type="button"
          data-testid="shell-dismiss"
          disabled={isDismissDisabled}
          onClick={() => onDismiss?.()}
        >
          Dismiss shell
        </button>
        {children}
      </div>
    ) : null,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
}))
vi.mock("@/features/map-search/components/filters/MapSearchFiltersForm", () => ({
  MapSearchFiltersForm: ({
    value,
    onChange,
    disabled,
  }: {
    value: { minRent?: number; maxRent?: number }
    onChange: (next: { minRent?: number; maxRent?: number }) => void
    disabled?: boolean
  }) => (
    <div data-testid="preferences-form">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange({ ...value, minRent: 12_000 })}
      >
        Set min rent
      </button>
      <span data-testid="min-rent">{value.minRent ?? "none"}</span>
      <span data-testid="max-rent">{value.maxRent ?? "none"}</span>
      <span data-testid="filters-disabled">
        {disabled ? "disabled" : "enabled"}
      </span>
    </div>
  ),
}))

const snapshot = {
  geoSearch: {
    mode: "area" as const,
    bounds: {
      northEast: { lat: 13.8, lng: 100.6 },
      southWest: { lat: 13.7, lng: 100.5 },
    },
  },
  previewGeo: {
    kind: "area" as const,
    bounds: {
      northEast: { lat: 13.8, lng: 100.6 },
      southWest: { lat: 13.7, lng: 100.5 },
    },
  },
  summaryTitle: "Visible map area",
  summaryDetail: "The same area as Search this area on the map.",
}

const emptyFilters = {}
const filtersWithMaxRent = { maxRent: 20_000 }

async function goToPreferences(
  user: ReturnType<typeof userEvent.setup>,
  name = "Family search",
  notes?: string,
) {
  fireEvent.change(screen.getByLabelText(/^Name/), {
    target: { value: name },
  })
  if (notes) {
    fireEvent.change(screen.getByLabelText(/^Notes$/), {
      target: { value: notes },
    })
  }
  await user.click(screen.getByRole("button", { name: "Continue" }))
  expect(await screen.findByTestId("preferences-form")).toBeInTheDocument()
}

describe("ConfirmCreateClientRequestModal", () => {
  beforeEach(() => {
    mutate.mockReset()
    reset.mockReset()
    toast.mockReset()
    createState.isPending = false
    createState.error = null
  })

  describe("visibility", () => {
    it("renders nothing when closed", () => {
      const { container } = render(
        <ConfirmCreateClientRequestModal
          isOpen={false}
          snapshot={snapshot}
          filters={emptyFilters}
          onClose={vi.fn()}
        />,
      )

      expect(container).toBeEmptyDOMElement()
    })

    it("renders nothing when snapshot is missing", () => {
      const { container } = render(
        <ConfirmCreateClientRequestModal
          isOpen
          snapshot={null}
          filters={emptyFilters}
          onClose={vi.fn()}
        />,
      )

      expect(container).toBeEmptyDOMElement()
    })
  })

  describe("details step", () => {
    it("shows the map hero, geo summary, and create copy", () => {
      render(
        <ConfirmCreateClientRequestModal
          isOpen
          snapshot={snapshot}
          filters={emptyFilters}
          onClose={vi.fn()}
        />,
      )

      expect(screen.getByTestId("readonly-map")).toBeInTheDocument()
      expect(screen.getByText("Visible map area")).toBeInTheDocument()
      expect(
        screen.getByText("The same area as Search this area on the map."),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("heading", { name: "Create client request" }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("status", { name: "Step 1 of 2" }),
      ).toBeInTheDocument()
    })

    it("stays on details when name is missing", () => {
      render(
        <ConfirmCreateClientRequestModal
          isOpen
          snapshot={snapshot}
          filters={emptyFilters}
          onClose={vi.fn()}
        />,
      )

      fireEvent.click(screen.getByRole("button", { name: "Continue" }))

      expect(
        screen.getByText("Enter a name for this request."),
      ).toBeInTheDocument()
      expect(screen.queryByTestId("preferences-form")).not.toBeInTheDocument()
    })

    it("clears the name error once the user starts typing", async () => {
      const user = userEvent.setup()
      render(
        <ConfirmCreateClientRequestModal
          isOpen
          snapshot={snapshot}
          filters={emptyFilters}
          onClose={vi.fn()}
        />,
      )

      await user.click(screen.getByRole("button", { name: "Continue" }))
      expect(
        screen.getByText("Enter a name for this request."),
      ).toBeInTheDocument()

      await user.type(screen.getByLabelText(/^Name/), "F")

      expect(
        screen.queryByText("Enter a name for this request."),
      ).not.toBeInTheDocument()
    })

    it("closes from Cancel on the details step", async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(
        <ConfirmCreateClientRequestModal
          isOpen
          snapshot={snapshot}
          filters={emptyFilters}
          onClose={onClose}
        />,
      )

      await user.click(screen.getByRole("button", { name: "Cancel" }))

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("closes from the wizard close control", async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(
        <ConfirmCreateClientRequestModal
          isOpen
          snapshot={snapshot}
          filters={emptyFilters}
          onClose={onClose}
        />,
      )

      await user.click(
        screen.getByRole("button", { name: "Close create client request" }),
      )

      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe("preferences step", () => {
    it("moves from details to preferences with seeded map filters kept local", async () => {
      const user = userEvent.setup()
      render(
        <ConfirmCreateClientRequestModal
          isOpen
          snapshot={snapshot}
          filters={filtersWithMaxRent}
          onClose={vi.fn()}
        />,
      )

      await goToPreferences(user)

      expect(screen.queryByTestId("readonly-map")).not.toBeInTheDocument()
      expect(
        screen.getByRole("heading", { name: "Client preferences" }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("status", { name: "Step 2 of 2" }),
      ).toBeInTheDocument()
      expect(screen.getByTestId("max-rent")).toHaveTextContent("20000")
      expect(screen.getByTestId("min-rent")).toHaveTextContent("none")
    })

    it("creates with local draft filters and trimmed notes", async () => {
      const user = userEvent.setup()
      render(
        <ConfirmCreateClientRequestModal
          isOpen
          snapshot={snapshot}
          filters={filtersWithMaxRent}
          onClose={vi.fn()}
        />,
      )

      fireEvent.change(screen.getByLabelText(/^Name/), {
        target: { value: "  Family search  " },
      })
      fireEvent.change(screen.getByLabelText(/^Notes$/), {
        target: { value: "  LINE: family01  " },
      })
      await user.click(screen.getByRole("button", { name: "Continue" }))
      await user.click(await screen.findByRole("button", { name: "Set min rent" }))
      await user.click(screen.getByRole("button", { name: "Create request" }))

      expect(mutate).toHaveBeenCalledWith(
        {
          name: "Family search",
          description: "LINE: family01",
          geoSearch: snapshot.geoSearch,
          filters: { maxRent: 20_000, minRent: 12_000 },
        },
        expect.any(Object),
      )
    })

    it("sends null description when notes are empty", async () => {
      const user = userEvent.setup()
      render(
        <ConfirmCreateClientRequestModal
          isOpen
          snapshot={snapshot}
          filters={emptyFilters}
          onClose={vi.fn()}
        />,
      )

      await goToPreferences(user, "Family search")
      await user.click(screen.getByRole("button", { name: "Create request" }))

      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Family search",
          description: null,
          filters: {},
        }),
        expect.any(Object),
      )
    })

    it("clears draft filters without mutating the seed prop", async () => {
      const user = userEvent.setup()
      const seed = { maxRent: 20_000 }
      render(
        <ConfirmCreateClientRequestModal
          isOpen
          snapshot={snapshot}
          filters={seed}
          onClose={vi.fn()}
        />,
      )

      await goToPreferences(user)
      expect(screen.getByTestId("max-rent")).toHaveTextContent("20000")

      await user.click(screen.getByRole("button", { name: "Clear" }))

      expect(screen.getByTestId("max-rent")).toHaveTextContent("none")
      expect(screen.getByTestId("min-rent")).toHaveTextContent("none")
      expect(seed).toEqual({ maxRent: 20_000 })
    })

    it("returns to details with the map and preserved name via Back", async () => {
      const user = userEvent.setup()
      render(
        <ConfirmCreateClientRequestModal
          isOpen
          snapshot={snapshot}
          filters={emptyFilters}
          onClose={vi.fn()}
        />,
      )

      await goToPreferences(user, "Family search")
      await user.click(screen.getByRole("button", { name: "Back" }))

      expect(await screen.findByTestId("readonly-map")).toBeInTheDocument()
      expect(screen.getByLabelText(/^Name/)).toHaveValue("Family search")
      expect(
        screen.getByRole("status", { name: "Step 1 of 2" }),
      ).toBeInTheDocument()
    })

    it("shows mutation errors on the preferences step", async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()

      const { rerender } = render(
        <ConfirmCreateClientRequestModal
          isOpen
          snapshot={snapshot}
          filters={emptyFilters}
          onClose={onClose}
        />,
      )

      await goToPreferences(user)

      createState.error = new Error("Network failed")
      rerender(
        <ConfirmCreateClientRequestModal
          isOpen
          snapshot={snapshot}
          filters={emptyFilters}
          onClose={onClose}
        />,
      )

      expect(screen.getByTestId("preferences-form")).toBeInTheDocument()
      expect(screen.getByRole("alert")).toHaveTextContent("Network failed")
    })
  })

  describe("success toast", () => {
    it("closes the dialog before showing the success toast", async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      mutate.mockImplementation((_input, options) => {
        options?.onSuccess?.({ name: "Family search" })
      })

      render(
        <ConfirmCreateClientRequestModal
          isOpen
          snapshot={snapshot}
          filters={emptyFilters}
          onClose={onClose}
        />,
      )

      await goToPreferences(user)
      await user.click(screen.getByRole("button", { name: "Create request" }))

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: "Client request created",
          variant: "success-pill",
        })
      })

      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onClose.mock.invocationCallOrder[0]!).toBeLessThan(
        toast.mock.invocationCallOrder[0]!,
      )
    })
  })

  describe("submitting lock", () => {
    it("disables dismiss, close, and actions while pending", async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()

      const { rerender } = render(
        <ConfirmCreateClientRequestModal
          isOpen
          snapshot={snapshot}
          filters={emptyFilters}
          onClose={onClose}
        />,
      )

      await goToPreferences(user)

      createState.isPending = true
      rerender(
        <ConfirmCreateClientRequestModal
          isOpen
          snapshot={snapshot}
          filters={emptyFilters}
          onClose={onClose}
        />,
      )

      expect(screen.getByTestId("shell-dismiss")).toBeDisabled()
      expect(
        screen.getByRole("button", { name: "Close create client request" }),
      ).toBeDisabled()
      expect(screen.getByRole("button", { name: "Back" })).toBeDisabled()
      expect(screen.getByRole("button", { name: /Creating/ })).toBeDisabled()
      expect(screen.getByTestId("filters-disabled")).toHaveTextContent(
        "disabled",
      )

      await user.click(screen.getByTestId("shell-dismiss"))
      await user.click(
        screen.getByRole("button", { name: "Close create client request" }),
      )

      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe("reset on open", () => {
    it("resets wizard state when reopened", async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <ConfirmCreateClientRequestModal
          isOpen
          snapshot={snapshot}
          filters={filtersWithMaxRent}
          onClose={vi.fn()}
        />,
      )

      await goToPreferences(user, "Family search")
      await user.click(screen.getByRole("button", { name: "Set min rent" }))
      expect(screen.getByTestId("min-rent")).toHaveTextContent("12000")

      rerender(
        <ConfirmCreateClientRequestModal
          isOpen={false}
          snapshot={snapshot}
          filters={filtersWithMaxRent}
          onClose={vi.fn()}
        />,
      )
      rerender(
        <ConfirmCreateClientRequestModal
          isOpen
          snapshot={snapshot}
          filters={{ maxRent: 15_000 }}
          onClose={vi.fn()}
        />,
      )

      expect(reset).toHaveBeenCalled()
      expect(screen.getByTestId("readonly-map")).toBeInTheDocument()
      expect(screen.getByLabelText(/^Name/)).toHaveValue("")
      expect(
        screen.getByRole("status", { name: "Step 1 of 2" }),
      ).toBeInTheDocument()

      await goToPreferences(user, "New request")
      expect(screen.getByTestId("max-rent")).toHaveTextContent("15000")
      expect(screen.getByTestId("min-rent")).toHaveTextContent("none")
    })
  })
})
