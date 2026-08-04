import type { ComponentProps } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ClientRequestPreferencesStep } from "./ClientRequestPreferencesStep"

const filtersFormMock = vi.hoisted(() =>
  vi.fn(
    ({
      value,
      onChange,
      disabled,
      availableByFieldId,
    }: {
      value: { minRent?: number }
      onChange: (next: { minRent?: number }) => void
      disabled?: boolean
      availableByFieldId?: string
    }) => (
      <div data-testid="preferences-form">
        <span data-testid="filters-value">{value.minRent ?? "none"}</span>
        <span data-testid="available-by-id">{availableByFieldId}</span>
        <span data-testid="filters-disabled">
          {disabled ? "disabled" : "enabled"}
        </span>
        <button
          type="button"
          onClick={() => onChange({ ...value, minRent: 12_000 })}
        >
          Set min rent
        </button>
      </div>
    ),
  ),
)

vi.mock("@/features/map-search/components/filters/MapSearchFiltersForm", () => ({
  MapSearchFiltersForm: (
    props: Parameters<typeof filtersFormMock>[0],
  ) => filtersFormMock(props),
}))

function renderStep(
  overrides: Partial<ComponentProps<typeof ClientRequestPreferencesStep>> = {},
) {
  const onFiltersChange = overrides.onFiltersChange ?? vi.fn()
  const onBack = overrides.onBack ?? vi.fn()
  const onClear = overrides.onClear ?? vi.fn()
  const onPrimary = overrides.onPrimary ?? vi.fn()

  const result = render(
    <ClientRequestPreferencesStep
      filters={{}}
      availableByFieldId="available-by"
      onFiltersChange={onFiltersChange}
      onBack={onBack}
      onClear={onClear}
      onPrimary={onPrimary}
      {...overrides}
    />,
  )

  return { ...result, onFiltersChange, onBack, onClear, onPrimary }
}

describe("ClientRequestPreferencesStep", () => {
  beforeEach(() => {
    filtersFormMock.mockClear()
  })

  describe("filters form", () => {
    it("passes filters, availableByFieldId, and disabled into the form", () => {
      renderStep({
        filters: { minRent: 8_000 },
        availableByFieldId: "create-available-by",
        disabled: true,
      })

      expect(screen.getByTestId("filters-value")).toHaveTextContent("8000")
      expect(screen.getByTestId("available-by-id")).toHaveTextContent(
        "create-available-by",
      )
      expect(screen.getByTestId("filters-disabled")).toHaveTextContent(
        "disabled",
      )
    })

    it("forwards filter changes to the parent", async () => {
      const user = userEvent.setup()
      const { onFiltersChange } = renderStep({ filters: { maxRent: 20_000 } })

      await user.click(screen.getByRole("button", { name: "Set min rent" }))

      expect(onFiltersChange).toHaveBeenCalledWith({
        maxRent: 20_000,
        minRent: 12_000,
      })
    })
  })

  describe("submit error", () => {
    it("shows a submit error alert when provided", () => {
      renderStep({ submitError: "Request failed." })

      expect(screen.getByRole("alert")).toHaveTextContent("Request failed.")
    })

    it("hides the alert when there is no submit error", () => {
      renderStep()

      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })
  })

  describe("actions", () => {
    it("calls onBack, onClear, and onPrimary from the footer", async () => {
      const user = userEvent.setup()
      const { onBack, onClear, onPrimary } = renderStep()

      await user.click(screen.getByRole("button", { name: "Back" }))
      await user.click(screen.getByRole("button", { name: "Clear" }))
      await user.click(screen.getByRole("button", { name: "Create request" }))

      expect(onBack).toHaveBeenCalledTimes(1)
      expect(onClear).toHaveBeenCalledTimes(1)
      expect(onPrimary).toHaveBeenCalledTimes(1)
    })

    it("supports custom action labels for edit flows", async () => {
      const user = userEvent.setup()
      const { onBack, onClear, onPrimary } = renderStep({
        backLabel: "Previous",
        clearLabel: "Reset",
        primaryLabel: "Save changes",
      })

      await user.click(screen.getByRole("button", { name: "Previous" }))
      await user.click(screen.getByRole("button", { name: "Reset" }))
      await user.click(screen.getByRole("button", { name: "Save changes" }))

      expect(onBack).toHaveBeenCalledTimes(1)
      expect(onClear).toHaveBeenCalledTimes(1)
      expect(onPrimary).toHaveBeenCalledTimes(1)
      expect(
        screen.queryByRole("button", { name: "Create request" }),
      ).not.toBeInTheDocument()
    })

    it("renders footerStart before Back", () => {
      renderStep({
        footerStart: <span data-testid="footer-start">Hint</span>,
      })

      const footerStart = screen.getByTestId("footer-start")
      const back = screen.getByRole("button", { name: "Back" })

      expect(footerStart.compareDocumentPosition(back)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      )
    })
  })

  describe("disabled / pending", () => {
    it("disables all actions and shows the pending primary label", () => {
      renderStep({
        disabled: true,
        primaryPendingLabel: "Saving…",
      })

      expect(screen.getByRole("button", { name: "Back" })).toBeDisabled()
      expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled()
      expect(screen.getByRole("button", { name: /Saving/ })).toBeDisabled()
      expect(
        screen.queryByRole("button", { name: "Create request" }),
      ).not.toBeInTheDocument()
    })

    it("defaults the pending label to Creating…", () => {
      renderStep({ disabled: true })

      expect(
        screen.getByRole("button", { name: /Creating/ }),
      ).toBeInTheDocument()
    })

    it("does not fire actions while disabled", async () => {
      const user = userEvent.setup()
      const { onBack, onClear, onPrimary } = renderStep({ disabled: true })

      await user.click(screen.getByRole("button", { name: "Back" }))
      await user.click(screen.getByRole("button", { name: "Clear" }))
      await user.click(screen.getByRole("button", { name: /Creating/ }))

      expect(onBack).not.toHaveBeenCalled()
      expect(onClear).not.toHaveBeenCalled()
      expect(onPrimary).not.toHaveBeenCalled()
    })
  })
})
