import { afterEach, describe, expect, it, vi } from "vitest"

import {
  areAvailableAtValuesEqual,
  dateKeyToListingAvailabilityFields,
  getListingAvailabilityBadgePresentation,
  getListingAvailabilityDisplay,
  getListingAvailabilityLabel,
  getTodayDateKeyInBangkok,
  isListingAvailableNow,
  listingAvailabilityFieldsToDateKey,
  normalizeListingAvailableAt,
  parseAvailableAtFromApi,
  parseAvailableAtToFormFields,
  parseListingAvailabilityFromApi,
  normalizeListingAvailabilityPatchInput,
  resolveListingAvailabilityState,
  serializeAvailableAtForRequest,
  serializeListingAvailabilityForApi,
  toListingAvailabilityDateKey,
} from "./listingAvailability"

describe("listingAvailability", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("parses API values and maps them to form fields", () => {
    expect(parseAvailableAtFromApi(null)).toBeNull()
    expect(parseAvailableAtFromApi("2026-06-10T00:00:00+07:00")).toBe(
      "2026-06-09T17:00:00.000Z",
    )

    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

    expect(parseAvailableAtToFormFields(null)).toEqual({
      availabilityMode: "flexible",
      availableFromDate: "",
    })
    expect(
      parseAvailableAtToFormFields("2026-07-29T00:00:00+07:00"),
    ).toEqual({
      availabilityMode: "now",
      availableFromDate: "",
    })
    expect(
      parseAvailableAtToFormFields("2026-08-15T00:00:00+07:00"),
    ).toEqual({
      availabilityMode: "from_date",
      availableFromDate: "2026-08-15",
    })
  })

  it("serializes form fields to API request values", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

    expect(
      serializeListingAvailabilityForApi({
        availabilityMode: "flexible",
        availableFromDate: "",
      }),
    ).toBeNull()
    expect(
      serializeListingAvailabilityForApi({
        availabilityMode: "now",
        availableFromDate: "",
      }),
    ).toBe("2026-07-29")
    expect(
      serializeListingAvailabilityForApi({
        availabilityMode: "from_date",
        availableFromDate: "2026-08-15",
      }),
    ).toBe("2026-08-15")
  })

  it("normalizeListingAvailabilityPatchInput maps form fields to availableAt", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

    expect(
      normalizeListingAvailabilityPatchInput({
        rent: 15000,
        availabilityMode: "now",
        availableFromDate: "",
      }),
    ).toEqual({
      rent: 15000,
      availableAt: "2026-07-29",
    })
  })

  it("parseListingAvailabilityFromApi maps API values to form fields", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

    expect(parseListingAvailabilityFromApi(null)).toEqual({
      availabilityMode: "flexible",
      availableFromDate: "",
    })
    expect(parseListingAvailabilityFromApi("2026-08-15T00:00:00+07:00")).toEqual(
      {
        availabilityMode: "from_date",
        availableFromDate: "2026-08-15",
      },
    )
  })

  it("serializes form fields to API request values via serializeAvailableAtForRequest", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

    expect(serializeAvailableAtForRequest("flexible", "")).toBeNull()
    expect(serializeAvailableAtForRequest("now", "")).toBe("2026-07-29")
    expect(
      serializeAvailableAtForRequest("from_date", "2026-08-15"),
    ).toBe("2026-08-15")
    expect(serializeAvailableAtForRequest("from_date", "invalid")).toBeNull()
  })

  it("maps listing form fields to and from date picker values", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

    expect(
      listingAvailabilityFieldsToDateKey({
        availabilityMode: "flexible",
        availableFromDate: "",
      }),
    ).toBeNull()
    expect(
      listingAvailabilityFieldsToDateKey({
        availabilityMode: "now",
        availableFromDate: "",
      }),
    ).toBe("2026-07-29")
    expect(
      listingAvailabilityFieldsToDateKey({
        availabilityMode: "from_date",
        availableFromDate: "2026-08-15",
      }),
    ).toBe("2026-08-15")
    expect(
      listingAvailabilityFieldsToDateKey({
        availabilityMode: "from_date",
        availableFromDate: "bad",
      }),
    ).toBeNull()

    expect(dateKeyToListingAvailabilityFields(null)).toEqual({
      availabilityMode: "flexible",
      availableFromDate: "",
    })
    expect(dateKeyToListingAvailabilityFields("2026-07-29")).toEqual({
      availabilityMode: "now",
      availableFromDate: "",
    })
    expect(dateKeyToListingAvailabilityFields("2026-07-20")).toEqual({
      availabilityMode: "now",
      availableFromDate: "",
    })
    expect(dateKeyToListingAvailabilityFields("2026-08-15")).toEqual({
      availabilityMode: "from_date",
      availableFromDate: "2026-08-15",
    })
    expect(dateKeyToListingAvailabilityFields("bad")).toEqual({
      availabilityMode: "flexible",
      availableFromDate: "",
    })
  })

  it("parses defensive API values", () => {
    expect(parseAvailableAtFromApi(undefined)).toBeNull()
    expect(parseAvailableAtFromApi(12)).toBeNull()
    expect(parseAvailableAtFromApi("not-a-date")).toBeNull()
    expect(parseAvailableAtFromApi("")).toBeNull()
  })

  it("compares availability values by Bangkok calendar day", () => {
    expect(
      areAvailableAtValuesEqual(
        "2026-07-29T00:00:00+07:00",
        "2026-07-29T12:34:56+07:00",
      ),
    ).toBe(true)
    expect(
      areAvailableAtValuesEqual(
        "2026-07-29T00:00:00+07:00",
        "2026-07-30T00:00:00+07:00",
      ),
    ).toBe(false)
    expect(areAvailableAtValuesEqual(null, null)).toBe(true)
    expect(areAvailableAtValuesEqual(null, "2026-07-29T00:00:00+07:00")).toBe(
      false,
    )
  })

  it("formats display labels for flexible, now, and future dates", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

    expect(getListingAvailabilityLabel(null)).toBe("Flexible")
    expect(getListingAvailabilityLabel("2026-07-29T00:00:00+07:00")).toBe(
      "Available now",
    )
    expect(getListingAvailabilityLabel("2026-07-28T00:00:00+07:00")).toBe(
      "Available now",
    )
    expect(getListingAvailabilityLabel("2026-08-15T00:00:00+07:00")).toBe(
      "Available from Aug 15, 2026",
    )
  })

  it("builds photo badge presentation for available-now vs later dates", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

    expect(isListingAvailableNow(null)).toBe(false)
    expect(isListingAvailableNow("2026-07-29T00:00:00+07:00")).toBe(true)
    expect(isListingAvailableNow("2026-08-15T00:00:00+07:00")).toBe(false)

    expect(getListingAvailabilityBadgePresentation(null)).toEqual({
      label: "Flexible",
      tone: "secondary",
      isAvailableNow: false,
    })
    expect(
      getListingAvailabilityBadgePresentation("2026-07-28T00:00:00+07:00"),
    ).toEqual({
      label: "Available now",
      tone: "active",
      isAvailableNow: true,
    })
    expect(
      getListingAvailabilityBadgePresentation("2026-08-15T00:00:00+07:00"),
    ).toEqual({
      label: "Aug 15, 2026",
      tone: "secondary",
      isAvailableNow: false,
    })
  })

  it("normalizes ISO and date keys once without repeating date math", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

    expect(toListingAvailabilityDateKey(null)).toBeNull()
    expect(toListingAvailabilityDateKey("not-a-date")).toBeNull()
    expect(toListingAvailabilityDateKey("2026-08-15")).toBe("2026-08-15")
    expect(toListingAvailabilityDateKey("2026-08-15T00:00:00+07:00")).toBe(
      "2026-08-15",
    )

    expect(
      resolveListingAvailabilityState("2026-07-28T00:00:00+07:00"),
    ).toEqual({
      kind: "now",
      dateKey: "2026-07-28",
      isAvailableNow: true,
    })
    expect(resolveListingAvailabilityState("garbage")).toEqual({
      kind: "flexible",
      dateKey: null,
      isAvailableNow: false,
    })
    expect(
      areAvailableAtValuesEqual(
        "2026-08-15T00:00:00+07:00",
        "2026-08-15",
      ),
    ).toBe(true)
  })

  it("uses Bangkok for today comparisons", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-28T18:00:00.000Z"))

    expect(getTodayDateKeyInBangkok()).toBe("2026-07-29")
  })

  it("builds structured display data for UI variants", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

    expect(normalizeListingAvailableAt(undefined)).toBeNull()
    expect(normalizeListingAvailableAt(42)).toBeNull()
    expect(normalizeListingAvailableAt("")).toBeNull()
    expect(normalizeListingAvailableAt("   ")).toBeNull()

    expect(getListingAvailabilityDisplay(null)).toEqual({
      kind: "flexible",
      label: "Flexible",
      tone: "secondary",
      isAvailableNow: false,
      shortDateLabel: null,
      fullDateLabel: null,
      ariaLabel: "Flexible",
    })

    expect(
      getListingAvailabilityDisplay("2026-07-29T00:00:00+07:00"),
    ).toEqual({
      kind: "now",
      label: "Available now",
      tone: "active",
      isAvailableNow: true,
      shortDateLabel: null,
      fullDateLabel: null,
      ariaLabel: "Available now",
    })

    expect(
      getListingAvailabilityDisplay("2026-08-15T00:00:00+07:00"),
    ).toEqual({
      kind: "from_date",
      label: "Aug 15, 2026",
      tone: "secondary",
      isAvailableNow: false,
      shortDateLabel: "Aug 15",
      fullDateLabel: "Aug 15, 2026",
      ariaLabel: "Available from Aug 15, 2026",
    })
  })

  it("keeps badge, label, and display helpers aligned for the same input", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

    const inputs = [
      null,
      "2026-07-29T00:00:00+07:00",
      "2026-08-15T00:00:00+07:00",
      "garbage",
    ] as const

    for (const availableAt of inputs) {
      const display = getListingAvailabilityDisplay(availableAt)
      const badge = getListingAvailabilityBadgePresentation(availableAt)
      const label = getListingAvailabilityLabel(availableAt)

      expect(display.label).toBe(badge.label)
      expect(display.tone).toBe(badge.tone)
      expect(display.isAvailableNow).toBe(badge.isAvailableNow)
      expect(display.ariaLabel).toBe(label)
    }
  })
})
