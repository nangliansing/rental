import {
  AirVent,
  Armchair,
  Bath,
  BedDouble,
  CircleDot,
  CookingPot,
  DoorOpen,
  Fan,
  Heater,
  LampDesk,
  Microwave,
  Refrigerator,
  Shirt,
  Sofa,
  Tv,
  WashingMachine,
  Wifi,
} from "lucide-react"
import { describe, expect, it } from "vitest"

import {
  getListingFacilityIcon,
  getListingFacilityLabel,
  normalizeListingFacilities,
} from "./listingFacilityDisplay"

describe("listingFacilityDisplay", () => {
  it("maps known facility labels and icons", () => {
    expect(getListingFacilityLabel("Wifi")).toBe("Wi-Fi")
    expect(getListingFacilityLabel("Air Conditioner")).toBe("Aircon")
    expect(getListingFacilityLabel("Private Bathroom")).toBe("Private bath")
    expect(getListingFacilityIcon("Wifi")).toBe(Wifi)
    expect(getListingFacilityIcon("TV")).toBe(Tv)
    expect(getListingFacilityIcon("Air Conditioner")).toBe(AirVent)
    expect(getListingFacilityIcon("Fan")).toBe(Fan)
    expect(getListingFacilityIcon("Refrigerator")).toBe(Refrigerator)
    expect(getListingFacilityIcon("Microwave")).toBe(Microwave)
    expect(getListingFacilityIcon("Washing Machine")).toBe(WashingMachine)
    expect(getListingFacilityIcon("Water Heater")).toBe(Heater)
    expect(getListingFacilityIcon("Desk")).toBe(LampDesk)
    expect(getListingFacilityIcon("Chair")).toBe(Armchair)
    expect(getListingFacilityIcon("Wardrobe")).toBe(Shirt)
    expect(getListingFacilityIcon("Bed")).toBe(BedDouble)
    expect(getListingFacilityIcon("Sofa")).toBe(Sofa)
    expect(getListingFacilityIcon("Balcony")).toBe(DoorOpen)
    expect(getListingFacilityIcon("Private Bathroom")).toBe(Bath)
    expect(getListingFacilityIcon("Cooking Equipment")).toBe(CookingPot)
  })

  it("falls back for unknown facilities", () => {
    expect(getListingFacilityLabel("  Smart Lock  ")).toBe("Smart Lock")
    expect(getListingFacilityIcon("Smart Lock")).toBe(CircleDot)
  })

  it("matches labels and icons case-insensitively", () => {
    expect(getListingFacilityLabel(" wifi ")).toBe("Wi-Fi")
    expect(getListingFacilityIcon(" wifi ")).toBe(Wifi)
    expect(getListingFacilityIcon("balcony")).toBe(DoorOpen)
  })

  it("normalizes facilities defensively", () => {
    expect(
      normalizeListingFacilities([
        null,
        " ",
        " Wifi ",
        "wifi",
        "Balcony",
        42,
        "  Custom Amenity ",
      ] as never),
    ).toEqual(["Wifi", "Balcony", "Custom Amenity"])
  })

  it("returns an empty list for non-arrays", () => {
    expect(normalizeListingFacilities(null)).toEqual([])
    expect(normalizeListingFacilities("Wifi")).toEqual([])
  })
})
