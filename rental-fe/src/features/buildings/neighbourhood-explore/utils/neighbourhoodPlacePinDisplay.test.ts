import { Bus, Coffee, Ship, TrainFront } from "lucide-react"
import { describe, expect, it } from "vitest"

import {
  getNeighbourhoodPlacePinDisplay,
  getPublicTransportPinDisplay,
  PUBLIC_TRANSPORT_BUS_PIN_COLOR,
  PUBLIC_TRANSPORT_FERRY_PIN_COLOR,
  PUBLIC_TRANSPORT_RAIL_PIN_COLOR,
} from "./neighbourhoodPlacePinDisplay"

describe("getPublicTransportPinDisplay", () => {
  it("uses a bus icon for bus stops and stations", () => {
    expect(getPublicTransportPinDisplay("bus")).toEqual({
      color: PUBLIC_TRANSPORT_BUS_PIN_COLOR,
      Icon: Bus,
    })
  })

  it("uses a ferry icon for ferry terminals", () => {
    expect(getPublicTransportPinDisplay("ferry")).toEqual({
      color: PUBLIC_TRANSPORT_FERRY_PIN_COLOR,
      Icon: Ship,
    })
  })

  it("uses a train icon for rail modes", () => {
    const railDisplay = {
      color: PUBLIC_TRANSPORT_RAIL_PIN_COLOR,
      Icon: TrainFront,
    }

    expect(getPublicTransportPinDisplay("bts")).toEqual(railDisplay)
    expect(getPublicTransportPinDisplay("mrt")).toEqual(railDisplay)
    expect(getPublicTransportPinDisplay("rail")).toEqual(railDisplay)
    expect(getPublicTransportPinDisplay("transit")).toEqual(railDisplay)
    expect(getPublicTransportPinDisplay(undefined)).toEqual(railDisplay)
  })
})

describe("getNeighbourhoodPlacePinDisplay", () => {
  it("keeps category icons for non-transit places", () => {
    expect(getNeighbourhoodPlacePinDisplay("cafe").Icon).toBe(Coffee)
  })

  it("uses transit mode icons for public transport places", () => {
    expect(getNeighbourhoodPlacePinDisplay("public_transport", "bus")).toEqual({
      color: PUBLIC_TRANSPORT_BUS_PIN_COLOR,
      Icon: Bus,
    })
    expect(getNeighbourhoodPlacePinDisplay("public_transport", "ferry")).toEqual({
      color: PUBLIC_TRANSPORT_FERRY_PIN_COLOR,
      Icon: Ship,
    })
    expect(getNeighbourhoodPlacePinDisplay("public_transport", "mrt")).toEqual({
      color: PUBLIC_TRANSPORT_RAIL_PIN_COLOR,
      Icon: TrainFront,
    })
  })
})
