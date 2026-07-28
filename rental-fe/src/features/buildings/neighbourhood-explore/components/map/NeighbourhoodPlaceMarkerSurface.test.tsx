import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { NeighbourhoodPlaceMarkerSurface } from "./NeighbourhoodPlaceMarkerSurface"

describe("NeighbourhoodPlaceMarkerSurface", () => {
  it("calls onSelect when the pin surface is tapped", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <NeighbourhoodPlaceMarkerSurface label="Local Cafe" onSelect={onSelect}>
        <span>Pin</span>
      </NeighbourhoodPlaceMarkerSurface>,
    )

    await user.click(screen.getByLabelText("Local Cafe"))

    expect(onSelect).toHaveBeenCalledOnce()
  })

  it("stops click propagation after a tap so the map does not receive it", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const onMapClick = vi.fn()

    render(
      <div onClick={onMapClick}>
        <NeighbourhoodPlaceMarkerSurface label="Local Cafe" onSelect={onSelect}>
          <span>Pin</span>
        </NeighbourhoodPlaceMarkerSurface>
      </div>,
    )

    await user.click(screen.getByLabelText("Local Cafe"))

    expect(onSelect).toHaveBeenCalledOnce()
    expect(onMapClick).not.toHaveBeenCalled()
  })

  it("allows pointer down to propagate so the map can start panning", () => {
    const onSelect = vi.fn()
    const onMapPointerDown = vi.fn()

    render(
      <div onPointerDown={onMapPointerDown}>
        <NeighbourhoodPlaceMarkerSurface label="Local Cafe" onSelect={onSelect}>
          <span>Pin</span>
        </NeighbourhoodPlaceMarkerSurface>
      </div>,
    )

    screen.getByLabelText("Local Cafe").dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        button: 0,
      }),
    )

    expect(onMapPointerDown).toHaveBeenCalledOnce()
  })
})
