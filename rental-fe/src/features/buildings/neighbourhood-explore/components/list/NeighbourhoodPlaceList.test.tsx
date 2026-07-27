import { createRef } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { NeighbourhoodPlace } from "../../../api/getBuildingNeighbourhood"
import {
  NeighbourhoodPlaceList,
  type NeighbourhoodPlaceListHandle,
} from "./NeighbourhoodPlaceList"

const places: NeighbourhoodPlace[] = [
  {
    id: "place-1",
    name: "Place one",
    lat: 13.76,
    lng: 100.64,
    category: "cafe",
    distanceMeters: 120,
  },
  {
    id: "place-2",
    name: "Place two",
    lat: 13.761,
    lng: 100.641,
    category: "restaurant",
    distanceMeters: 240,
  },
]

describe("NeighbourhoodPlaceList", () => {
  it("renders place items and highlights the active item", () => {
    render(
      <NeighbourhoodPlaceList
        places={places}
        activePlaceId="place-2"
        onPlaceSelect={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("button", { name: /Place one/i }),
    ).not.toHaveAttribute("aria-current")
    expect(screen.getByRole("button", { name: /Place two/i })).toHaveAttribute(
      "aria-current",
      "true",
    )
  })

  it("calls onPlaceSelect when an item is clicked", async () => {
    const user = userEvent.setup()
    const onPlaceSelect = vi.fn()

    render(
      <NeighbourhoodPlaceList
        places={places}
        activePlaceId={null}
        onPlaceSelect={onPlaceSelect}
      />,
    )

    await user.click(screen.getByRole("button", { name: /Place one/i }))

    expect(onPlaceSelect).toHaveBeenCalledWith("place-1")
  })

  it("scrolls an item into view through the forwarded ref", () => {
    const listRef = createRef<NeighbourhoodPlaceListHandle>()
    const scrollTo = vi.fn()

    render(
      <NeighbourhoodPlaceList
        ref={listRef}
        places={places}
        activePlaceId={null}
        onPlaceSelect={vi.fn()}
      />,
    )

    const container = screen.getByRole("list")
    Object.defineProperty(container, "scrollTop", {
      configurable: true,
      value: 0,
      writable: true,
    })
    Object.defineProperty(container, "scrollHeight", {
      configurable: true,
      value: 500,
    })
    Object.defineProperty(container, "clientHeight", {
      configurable: true,
      value: 80,
    })
    Object.defineProperty(container, "scrollTo", {
      configurable: true,
      value: scrollTo,
    })

    vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
      top: 0,
      bottom: 80,
      left: 0,
      right: 200,
      width: 200,
      height: 80,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    const target = screen.getByRole("button", { name: /Place two/i })
    Object.defineProperty(target, "offsetHeight", {
      configurable: true,
      value: 60,
    })
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      top: 200,
      bottom: 260,
      left: 0,
      right: 200,
      width: 200,
      height: 60,
      x: 0,
      y: 200,
      toJSON: () => ({}),
    })

    expect(listRef.current?.scrollToPlace("place-2")).toBe(true)
    expect(scrollTo).toHaveBeenCalledWith({ top: 180, behavior: "smooth" })
  })

  it("scrolls using an external scroll root when provided", () => {
    const listRef = createRef<NeighbourhoodPlaceListHandle>()
    const scrollRootRef = createRef<HTMLDivElement>(null)
    const scrollTo = vi.fn()

    render(
      <div ref={scrollRootRef}>
        <NeighbourhoodPlaceList
          ref={listRef}
          places={places}
          activePlaceId={null}
          onPlaceSelect={vi.fn()}
          scrollRootRef={scrollRootRef}
        />
      </div>,
    )

    const container = scrollRootRef.current!
    Object.defineProperties(container, {
      scrollTop: { configurable: true, value: 0, writable: true },
      scrollHeight: { configurable: true, value: 500 },
      clientHeight: { configurable: true, value: 80 },
      scrollTo: { configurable: true, value: scrollTo },
    })

    vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
      top: 0,
      bottom: 80,
      left: 0,
      right: 200,
      width: 200,
      height: 80,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    const target = screen.getByRole("button", { name: /Place two/i })
    Object.defineProperty(target, "offsetHeight", {
      configurable: true,
      value: 60,
    })
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      top: 200,
      bottom: 260,
      left: 0,
      right: 200,
      width: 200,
      height: 60,
      x: 0,
      y: 200,
      toJSON: () => ({}),
    })

    expect(listRef.current?.scrollToPlace("place-2")).toBe(true)
    expect(scrollTo).toHaveBeenCalledWith({ top: 180, behavior: "smooth" })
  })
})
