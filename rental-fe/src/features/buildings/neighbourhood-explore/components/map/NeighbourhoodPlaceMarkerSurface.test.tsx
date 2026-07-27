import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { NeighbourhoodPlaceMarkerSurface } from "./NeighbourhoodPlaceMarkerSurface"

describe("NeighbourhoodPlaceMarkerSurface", () => {
  it("calls onSelect when the pin surface is clicked", async () => {
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

  it("stops click propagation so the map does not receive the event", async () => {
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

  it("stops pointer and mouse down propagation", () => {
    const onSelect = vi.fn()
    const onMapPointerDown = vi.fn()
    const onMapMouseDown = vi.fn()

    render(
      <div
        onPointerDown={onMapPointerDown}
        onMouseDown={onMapMouseDown}
      >
        <NeighbourhoodPlaceMarkerSurface label="Local Cafe" onSelect={onSelect}>
          <span>Pin</span>
        </NeighbourhoodPlaceMarkerSurface>
      </div>,
    )

    const surface = screen.getByLabelText("Local Cafe")

    surface.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, cancelable: true }),
    )
    surface.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
    )

    expect(onMapPointerDown).not.toHaveBeenCalled()
    expect(onMapMouseDown).not.toHaveBeenCalled()
  })
})
