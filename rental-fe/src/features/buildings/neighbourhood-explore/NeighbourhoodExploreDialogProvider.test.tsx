import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
  NeighbourhoodExploreDialogProvider,
  useNeighbourhoodExploreDialogContext,
} from "./NeighbourhoodExploreDialogProvider"

vi.mock("./components/BuildingNeighbourhoodExploreModal", () => ({
  BuildingNeighbourhoodExploreModal: ({
    isOpen,
    onClose,
    buildingId,
  }: {
    isOpen: boolean
    onClose: () => void
    buildingId: string | null
  }) =>
    isOpen && buildingId ? (
      <div role="dialog" aria-label="Explore neighbourhood">
        <p data-testid="modal-building-id">{buildingId}</p>
        <button type="button" onClick={onClose}>
          Close explore
        </button>
      </div>
    ) : null,
}))

function ExploreTrigger() {
  const explore = useNeighbourhoodExploreDialogContext()

  if (!explore) return null

  return (
    <button type="button" onClick={(event) => explore.open(event.currentTarget)}>
      Open explore
    </button>
  )
}

describe("NeighbourhoodExploreDialogProvider", () => {
  it("shares one explore dialog between trigger and modal", async () => {
    const user = userEvent.setup()

    render(
      <NeighbourhoodExploreDialogProvider buildingId="building-1">
        <ExploreTrigger />
      </NeighbourhoodExploreDialogProvider>,
    )

    await user.click(screen.getByRole("button", { name: "Open explore" }))

    expect(
      screen.getByRole("dialog", { name: "Explore neighbourhood" }),
    ).toBeInTheDocument()
    expect(screen.getByTestId("modal-building-id")).toHaveTextContent("building-1")
  })

  it("closes the dialog and restores focus to the trigger", async () => {
    const user = userEvent.setup()

    render(
      <NeighbourhoodExploreDialogProvider buildingId="building-1">
        <ExploreTrigger />
      </NeighbourhoodExploreDialogProvider>,
    )

    const trigger = screen.getByRole("button", { name: "Open explore" })

    await user.click(trigger)

    expect(
      screen.getByRole("dialog", { name: "Explore neighbourhood" }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Close explore" }))

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Explore neighbourhood" }),
      ).not.toBeInTheDocument()
    })

    expect(trigger).toHaveFocus()
  })

  it("does not open a modal when the building id is missing", async () => {
    const user = userEvent.setup()

    render(
      <NeighbourhoodExploreDialogProvider buildingId={null}>
        <ExploreTrigger />
      </NeighbourhoodExploreDialogProvider>,
    )

    await user.click(screen.getByRole("button", { name: "Open explore" }))

    expect(
      screen.queryByRole("dialog", { name: "Explore neighbourhood" }),
    ).not.toBeInTheDocument()
  })
})
