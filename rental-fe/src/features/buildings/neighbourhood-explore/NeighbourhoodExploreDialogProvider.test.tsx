import { render, screen } from "@testing-library/react"
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
  }: {
    isOpen: boolean
    onClose: () => void
  }) =>
    isOpen ? (
      <div role="dialog" aria-label="Explore neighbourhood">
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
  })
})
