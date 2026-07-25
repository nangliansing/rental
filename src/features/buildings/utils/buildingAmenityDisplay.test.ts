import {
  AlarmSmoke,
  ArrowUpDown,
  BellRing,
  Car,
  Cctv,
  CircleDot,
  DoorOpen,
  Dumbbell,
  Fence,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  WashingMachine,
  Waves,
} from "lucide-react"
import { describe, expect, it } from "vitest"

import {
  getBuildingAmenityIcon,
  getBuildingAmenityLabel,
} from "./buildingAmenityDisplay"

describe("buildingAmenityDisplay", () => {
  it("maps known facility labels and icons", () => {
    expect(getBuildingAmenityLabel("Parking")).toBe("Parking")
    expect(getBuildingAmenityLabel("Swimming Pool")).toBe("Pool")
    expect(getBuildingAmenityIcon("Parking")).toBe(Car)
    expect(getBuildingAmenityIcon("Lift")).toBe(ArrowUpDown)
    expect(getBuildingAmenityIcon("Laundry")).toBe(WashingMachine)
    expect(getBuildingAmenityIcon("Gym")).toBe(Dumbbell)
    expect(getBuildingAmenityIcon("Swimming Pool")).toBe(Waves)
  })

  it("maps known security labels and icons", () => {
    expect(getBuildingAmenityLabel("Keycard Access")).toBe("Keycard")
    expect(getBuildingAmenityIcon("CCTV")).toBe(Cctv)
    expect(getBuildingAmenityIcon("Security Guard")).toBe(ShieldCheck)
    expect(getBuildingAmenityIcon("Keycard Access")).toBe(KeyRound)
    expect(getBuildingAmenityIcon("Access Control")).toBe(LockKeyhole)
    expect(getBuildingAmenityIcon("Gated Entrance")).toBe(Fence)
    expect(getBuildingAmenityIcon("Fire Alarm")).toBe(BellRing)
    expect(getBuildingAmenityIcon("Smoke Detector")).toBe(AlarmSmoke)
    expect(getBuildingAmenityIcon("Emergency Exit")).toBe(DoorOpen)
  })

  it("falls back for unknown amenities", () => {
    expect(getBuildingAmenityLabel("  Rooftop Garden  ")).toBe("Rooftop Garden")
    expect(getBuildingAmenityIcon("Rooftop Garden")).toBe(CircleDot)
  })

  it("matches icons case-insensitively", () => {
    expect(getBuildingAmenityIcon(" gym ")).toBe(Dumbbell)
    expect(getBuildingAmenityIcon("cctv")).toBe(Cctv)
  })
})
