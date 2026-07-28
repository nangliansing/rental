import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { useMapOverlayTapSelect } from "./useMapOverlayTapSelect"

function TapTarget({ onSelect }: { onSelect: () => void }) {
  const { onPointerDown, onClick } = useMapOverlayTapSelect(onSelect)

  return (
    <button type="button" aria-label="Map pin" onPointerDown={onPointerDown} onClick={onClick}>
      Pin
    </button>
  )
}

describe("useMapOverlayTapSelect", () => {
  it("selects on tap", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <div onPointerDown={vi.fn()}>
        <TapTarget onSelect={onSelect} />
      </div>,
    )

    await user.click(screen.getByLabelText("Map pin"))

    expect(onSelect).toHaveBeenCalledOnce()
  })

  it("allows pointer down to propagate so the map can start panning", () => {
    const onSelect = vi.fn()
    const onMapPointerDown = vi.fn()

    render(
      <div onPointerDown={onMapPointerDown}>
        <TapTarget onSelect={onSelect} />
      </div>,
    )

    screen.getByLabelText("Map pin").dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        button: 0,
      }),
    )

    expect(onMapPointerDown).toHaveBeenCalledOnce()
  })

  it("does not select when the pointer moves beyond the tap slop", () => {
    const onSelect = vi.fn()

    render(<TapTarget onSelect={onSelect} />)

    const pin = screen.getByLabelText("Map pin")

    pin.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        clientX: 10,
        clientY: 10,
        pointerId: 1,
        button: 0,
      }),
    )

    window.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        clientX: 30,
        clientY: 10,
        pointerId: 1,
        button: 0,
      }),
    )

    window.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        clientX: 30,
        clientY: 10,
        pointerId: 1,
        button: 0,
      }),
    )

    expect(onSelect).not.toHaveBeenCalled()
  })
})
