import { describe, expect, it } from "vitest"

import {
  calculateEstimatedMonthlyCost,
  DEFAULT_MONTHLY_COST_INPUTS,
} from "./monthlyCost"

describe("calculateEstimatedMonthlyCost", () => {
  it("calculates explicit minimum and maximum monthly costs", () => {
    expect(
      calculateEstimatedMonthlyCost({
        rent: 4000,
        electricRate: 10,
        waterRate: 20,
        minElectricUsage: 100,
        maxElectricUsage: 200,
        minWaterUsage: 4,
        maxWaterUsage: 8,
      }),
    ).toEqual({ minCost: 5080, maxCost: 6160 })
  })

  it("accepts trimmed numeric strings", () => {
    expect(
      calculateEstimatedMonthlyCost({
        rent: " 4000 ",
        electricRate: "10",
        waterRate: "20",
        minElectricUsage: "100",
        maxElectricUsage: "200",
        minWaterUsage: "4",
        maxWaterUsage: "8",
      }),
    ).toEqual({ minCost: 5080, maxCost: 6160 })
  })

  it.each(["1e3", "0x10", "+100", "1,000", "Infinity", "NaN"])(
    "rejects non-decimal numeric string syntax: %s",
    (rent) => {
      expect(calculateEstimatedMonthlyCost({ rent })).toBeNull()
    },
  )

  it("uses Bangkok apartment planning defaults for omitted values", () => {
    expect(DEFAULT_MONTHLY_COST_INPUTS).toEqual({
      electricRate: 5,
      waterRate: 20,
      minElectricUsage: 100,
      maxElectricUsage: 300,
      minWaterUsage: 4,
      maxWaterUsage: 10,
    })
    expect(calculateEstimatedMonthlyCost({ rent: 4000 })).toEqual({
      minCost: 4580,
      maxCost: 5700,
    })
  })

  it("treats blank optional inputs as omitted", () => {
    expect(
      calculateEstimatedMonthlyCost({
        rent: 4000,
        electricRate: " ",
        waterRate: null,
      }),
    ).toEqual({ minCost: 4580, maxCost: 5700 })
  })

  it("preserves valid zero rates and usage", () => {
    expect(
      calculateEstimatedMonthlyCost({
        rent: "0",
        electricRate: 0,
        waterRate: 0,
        minElectricUsage: 0,
        maxElectricUsage: 0,
        minWaterUsage: 0,
        maxWaterUsage: 0,
      }),
    ).toEqual({ minCost: 0, maxCost: 0 })
  })

  it("normalizes reversed usage bounds", () => {
    expect(
      calculateEstimatedMonthlyCost({
        rent: 4000,
        electricRate: 10,
        waterRate: 20,
        minElectricUsage: 200,
        maxElectricUsage: 100,
        minWaterUsage: 8,
        maxWaterUsage: 4,
      }),
    ).toEqual({ minCost: 5080, maxCost: 6160 })
  })

  it("rounds monetary results to two decimal places", () => {
    expect(
      calculateEstimatedMonthlyCost({
        rent: 4000.1,
        electricRate: 5.555,
        waterRate: 20.125,
        minElectricUsage: 1,
        maxElectricUsage: 1,
        minWaterUsage: 1,
        maxWaterUsage: 1,
      }),
    ).toEqual({ minCost: 4025.78, maxCost: 4025.78 })
  })

  it.each([null, undefined, "", " ", "invalid", -1, Number.NaN, Infinity])(
    "returns null for invalid rent: %s",
    (rent) => {
      expect(calculateEstimatedMonthlyCost({ rent })).toBeNull()
    },
  )

  it.each([
    { electricRate: "invalid" },
    { waterRate: -1 },
    { minElectricUsage: Number.NaN },
    { maxElectricUsage: Infinity },
    { minWaterUsage: -1 },
    { maxWaterUsage: "not-a-number" },
  ])("returns null for invalid supplied utility input: %o", (input) => {
    expect(
      calculateEstimatedMonthlyCost({ rent: 4000, ...input }),
    ).toBeNull()
  })

  it("returns null when the calculated cost exceeds the safe numeric range", () => {
    expect(
      calculateEstimatedMonthlyCost({
        rent: Number.MAX_SAFE_INTEGER,
        electricRate: Number.MAX_SAFE_INTEGER,
        minElectricUsage: 2,
        maxElectricUsage: 2,
      }),
    ).toBeNull()
  })

  it.each([
    { label: "null", input: null },
    { label: "undefined", input: undefined },
    { label: "array", input: [] },
    { label: "number", input: 4000 },
    { label: "string", input: "4000" },
    { label: "boolean", input: true },
    { label: "function", input: () => 4000 },
  ])("returns null for a non-object input: $label", ({ input }) => {
    expect(calculateEstimatedMonthlyCost(input)).toBeNull()
  })

  it("returns null when the input has a throwing property getter", () => {
    const input = Object.defineProperty({}, "rent", {
      get() {
        throw new Error("untrusted getter")
      },
    })

    expect(calculateEstimatedMonthlyCost(input)).toBeNull()
  })

  it("returns null for a revoked proxy without throwing", () => {
    const { proxy, revoke } = Proxy.revocable({ rent: 4000 }, {})
    revoke()

    expect(calculateEstimatedMonthlyCost(proxy)).toBeNull()
  })

  it("rejects pathologically long numeric strings", () => {
    expect(
      calculateEstimatedMonthlyCost({ rent: "1".repeat(65) }),
    ).toBeNull()
    expect(
      calculateEstimatedMonthlyCost({
        rent: 4000,
        electricRate: " ".repeat(65),
      }),
    ).toBeNull()
  })
})
