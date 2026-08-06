import type { ReactNode } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ClientRequest } from "@/features/client-request/api"

import { ConfirmEditClientRequestModal } from "./ConfirmEditClientRequestModal"

const mutate = vi.hoisted(() => vi.fn())
const reset = vi.hoisted(() => vi.fn())
const toast = vi.hoisted(() => vi.fn())
const updateState = vi.hoisted(() => ({
  isPending: false,
  error: null as Error | null,
}))

vi.mock("@/features/client-request/api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/client-request/api")>()

  return {
    ...actual,
    useUpdateOwnerClientRequest: () => ({
      mutate,
      get isPending() {
        return updateState.isPending
      },
      get error() {
        return updateState.error
      },
      reset,
    }),
  }
})

vi.mock("@/hooks/use-toast", () => ({ toast }))
vi.mock("@/shared/google-maps/readonly-map", () => ({
  ReadOnlyMap: () => <div data-testid="readonly-map" />,
  searchLinesGeometryToPaths: () => null,
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
    </div>
  ),
}))
vi.mock("@/features/lister-picker", () => ({
  ListerPickerPanel: () => <div data-testid="lister-picker-panel" />,
}))
vi.mock("../hooks/useHydrateClientRequestSelectedListers", () => ({
  useHydrateClientRequestSelectedListers: () => undefined,
}))

function makeClientRequest(
  overrides: Partial<ClientRequest> = {},
): ClientRequest {
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

async function goToPreferences(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Continue" }))
  expect(await screen.findByTestId("preferences-form")).toBeInTheDocument()
}

async function goToListers(user: ReturnType<typeof userEvent.setup>) {
  await goToPreferences(user)
  await user.click(screen.getByRole("button", { name: "Continue" }))
  expect(await screen.findByTestId("lister-picker-panel")).toBeInTheDocument()
}

describe("ConfirmEditClientRequestModal", () => {
  beforeEach(() => {
    mutate.mockReset()
    reset.mockReset()
    toast.mockReset()
    updateState.isPending = false
    updateState.error = null
  })

  it("renders nothing when closed", () => {
    const { container } = render(
      <ConfirmEditClientRequestModal
        isOpen={false}
        clientRequest={makeClientRequest()}
        onClose={vi.fn()}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("seeds name, notes, location, and filters from the request", () => {
    render(
      <ConfirmEditClientRequestModal
        isOpen
        clientRequest={makeClientRequest()}
        onClose={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("heading", { name: "Edit saved search" }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/^Name/)).toHaveValue("Sukhumvit 2BR")
    expect(screen.getByLabelText(/^Notes$/)).toHaveValue("Near BTS")
    expect(screen.getByText("Asok")).toBeInTheDocument()
    expect(screen.getByTestId("readonly-map")).toBeInTheDocument()
    expect(
      screen.getByRole("status", { name: "Step 1 of 3" }),
    ).toBeInTheDocument()
  })

  it("saves name, description, and filters without changing geoSearch", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    mutate.mockImplementation((_vars, options) => {
      options?.onSuccess?.()
    })

    render(
      <ConfirmEditClientRequestModal
        isOpen
        clientRequest={makeClientRequest()}
        onClose={onClose}
      />,
    )

    fireEvent.change(screen.getByLabelText(/^Name/), {
      target: { value: "Updated name" },
    })
    await goToPreferences(user)
    await user.click(screen.getByRole("button", { name: "Set min rent" }))
    await user.click(screen.getByRole("button", { name: "Continue" }))
    expect(await screen.findByTestId("lister-picker-panel")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Preferred listers" }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(mutate).toHaveBeenCalledWith(
      {
        clientRequestId: "cr-1",
        name: "Updated name",
        description: "Near BTS",
        filters: {
          bedroomCount: 2,
          minRent: 12_000,
        },
      },
      expect.any(Object),
    )
    expect(onClose).toHaveBeenCalledOnce()
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        title: "Saved search updated",
        variant: "success-pill",
      })
    })
  })

  it("returns to preferences from the listers step", async () => {
    const user = userEvent.setup()
    render(
      <ConfirmEditClientRequestModal
        isOpen
        clientRequest={makeClientRequest()}
        onClose={vi.fn()}
      />,
    )

    await goToListers(user)
    await user.click(screen.getByRole("button", { name: "Back" }))

    expect(await screen.findByTestId("preferences-form")).toBeInTheDocument()
    expect(
      screen.getByRole("status", { name: "Step 2 of 3" }),
    ).toBeInTheDocument()
  })
})
