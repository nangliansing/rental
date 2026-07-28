import { describe, expect, it } from "vitest"

import {
  addCalendarMonthsToDateOnlyKey,
  buildDateOnlyKey,
  buildMonthDayGrid,
  compareDateOnlyKeys,
  formatCalendarMonthLabel,
  formatDateOnlyLabel,
  getCalendarDateKeyInTimeZone,
  getCalendarMonthFromDateOnlyKey,
  getDaysInMonth,
  getTodayDateKeyInTimeZone,
  isDateOnlyKeyInRange,
  isValidDateOnlyKey,
  normalizeDateOnlyKey,
  parseDateOnlyParts,
  resolveDateOnlyRangeBounds,
  resolveReferenceDate,
  shiftCalendarMonth,
} from "./calendarDate"

describe("calendarDate", () => {
  describe("validation", () => {
    it.each([
      ["2026-08-15", true],
      ["2024-02-29", true],
      ["2026-02-29", false],
      ["2026-00-10", false],
      ["2026-13-01", false],
      ["2026-04-31", false],
      ["26-08-15", false],
      ["2026/08/15", false],
      ["", false],
      ["   ", false],
      [null, false],
      [undefined, false],
      [20260815, false],
      [{}, false],
    ])("isValidDateOnlyKey(%j) => %s", (value, expected) => {
      expect(isValidDateOnlyKey(value)).toBe(expected)
    })

    it("normalizes trimmed valid keys and rejects everything else", () => {
      expect(normalizeDateOnlyKey(" 2026-08-15 ")).toBe("2026-08-15")
      expect(normalizeDateOnlyKey("2026-02-30")).toBeNull()
      expect(normalizeDateOnlyKey(null)).toBeNull()
      expect(normalizeDateOnlyKey(12)).toBeNull()
    })
  })

  describe("parse/build", () => {
    it("parses valid parts and rejects impossible days", () => {
      expect(parseDateOnlyParts("2026-01-01")).toEqual({
        year: 2026,
        month: 1,
        day: 1,
      })
      expect(parseDateOnlyParts("2026-02-30")).toBeNull()
      expect(parseDateOnlyParts("not-a-date")).toBeNull()
    })

    it("builds padded keys and rejects invalid day/month values", () => {
      expect(buildDateOnlyKey(2026, 8, 5)).toBe("2026-08-05")
      expect(buildDateOnlyKey(2026, 2, 29)).toBeNull()
      expect(buildDateOnlyKey(2024, 2, 29)).toBe("2024-02-29")
      expect(buildDateOnlyKey(2026, 0, 1)).toBeNull()
      expect(buildDateOnlyKey(2026.5, 8, 1)).toBeNull()
    })
  })

  describe("timezone and labels", () => {
    it("uses Thailand calendar day across UTC midnight boundaries", () => {
      expect(
        getCalendarDateKeyInTimeZone(new Date("2026-08-14T16:59:59.999Z")),
      ).toBe("2026-08-14")
      expect(
        getCalendarDateKeyInTimeZone(new Date("2026-08-14T17:00:00.000Z")),
      ).toBe("2026-08-15")
      expect(getCalendarDateKeyInTimeZone(new Date("invalid"))).toBeNull()
      expect(getCalendarDateKeyInTimeZone("2026-08-15" as never)).toBeNull()
    })

    it("formats readable labels and compares keys", () => {
      expect(formatDateOnlyLabel("2026-08-15")).toBe("Aug 15, 2026")
      expect(formatDateOnlyLabel(" bad ")).toBeNull()
      expect(compareDateOnlyKeys("2026-08-15", "2026-08-15")).toBe(0)
      expect(compareDateOnlyKeys("2026-08-14", "2026-08-15")).toBe(-1)
      expect(compareDateOnlyKeys("2026-08-16", "2026-08-15")).toBe(1)
    })

    it("resolves today and visible month from keys or fallback", () => {
      const reference = new Date("2026-07-29T12:00:00+07:00")
      expect(getTodayDateKeyInTimeZone(reference)).toBe("2026-07-29")
      expect(getCalendarMonthFromDateOnlyKey("2026-08-15")).toEqual({
        year: 2026,
        monthIndex: 7,
      })
      expect(getCalendarMonthFromDateOnlyKey("bad", reference)).toEqual({
        year: 2026,
        monthIndex: 6,
      })
      expect(formatCalendarMonthLabel({ year: 2026, monthIndex: 7 })).toBe(
        "August 2026",
      )
    })

    it("resolveReferenceDate keeps valid dates and falls back otherwise", () => {
      const valid = new Date("2026-07-29T12:00:00+07:00")
      expect(resolveReferenceDate(valid)).toBe(valid)
      expect(resolveReferenceDate(new Date("invalid"))).toBeInstanceOf(Date)
      expect(
        Number.isNaN(resolveReferenceDate(new Date("invalid")).getTime()),
      ).toBe(false)
      expect(resolveReferenceDate(undefined)).toBeInstanceOf(Date)
      expect(resolveReferenceDate("2026-07-29" as never)).toBeInstanceOf(Date)
    })
  })

  describe("month grid", () => {
    it("handles leap February and month shifting across year boundaries", () => {
      expect(getDaysInMonth(2024, 1)).toBe(29)
      expect(getDaysInMonth(2026, 1)).toBe(28)
      expect(shiftCalendarMonth({ year: 2026, monthIndex: 11 }, 1)).toEqual({
        year: 2027,
        monthIndex: 0,
      })
      expect(shiftCalendarMonth({ year: 2026, monthIndex: 0 }, -1)).toEqual({
        year: 2025,
        monthIndex: 11,
      })
      expect(shiftCalendarMonth({ year: 2026, monthIndex: 5 }, Number.NaN)).toEqual({
        year: 2026,
        monthIndex: 5,
      })
    })

    it("builds a Sunday-start grid with leading and trailing padding", () => {
      // August 2026 starts on Saturday.
      const weeks = buildMonthDayGrid(2026, 7)
      expect(weeks[0]).toEqual([null, null, null, null, null, null, 1])
      expect(weeks.at(-1)?.includes(31)).toBe(true)
      expect(weeks.every((week) => week.length === 7)).toBe(true)
    })
  })

  describe("range bounds", () => {
    it("applies disablePast and min/max bounds", () => {
      expect(
        resolveDateOnlyRangeBounds({
          disablePast: true,
          todayKey: "2026-07-29",
          minDate: "2026-07-01",
        }),
      ).toEqual({ minDate: "2026-07-29", maxDate: null })

      expect(
        resolveDateOnlyRangeBounds({
          disablePast: true,
          todayKey: "2026-07-29",
          minDate: "2026-08-01",
          maxDate: "2026-08-31",
        }),
      ).toEqual({ minDate: "2026-08-01", maxDate: "2026-08-31" })

      expect(
        resolveDateOnlyRangeBounds({
          minDate: "2026-09-01",
          maxDate: "2026-08-01",
        }),
      ).toEqual({ minDate: "2026-09-01", maxDate: "2026-08-01" })

      expect(isDateOnlyKeyInRange("2026-07-28", { minDate: "2026-07-29" })).toBe(
        false,
      )
      expect(isDateOnlyKeyInRange("2026-07-29", { minDate: "2026-07-29" })).toBe(
        true,
      )
      expect(isDateOnlyKeyInRange("2026-09-01", { maxDate: "2026-08-31" })).toBe(
        false,
      )
      expect(isDateOnlyKeyInRange("bad", { minDate: "2026-07-29" })).toBe(false)
      expect(isDateOnlyKeyInRange("2026-08-15", {})).toBe(true)
    })
  })

  describe("addCalendarMonthsToDateOnlyKey", () => {
    it("adds months and clamps end-of-month days", () => {
      expect(addCalendarMonthsToDateOnlyKey("2026-07-29", 1)).toBe("2026-08-29")
      expect(addCalendarMonthsToDateOnlyKey("2026-07-29", 3)).toBe("2026-10-29")
      expect(addCalendarMonthsToDateOnlyKey("2026-01-31", 1)).toBe("2026-02-28")
      expect(addCalendarMonthsToDateOnlyKey("2024-01-31", 1)).toBe("2024-02-29")
      expect(addCalendarMonthsToDateOnlyKey("2026-11-30", 2)).toBe("2027-01-30")
      expect(addCalendarMonthsToDateOnlyKey("2026-07-29", 0)).toBe("2026-07-29")
      expect(addCalendarMonthsToDateOnlyKey("2026-07-29", -1)).toBe("2026-06-29")
      expect(addCalendarMonthsToDateOnlyKey("bad", 1)).toBeNull()
      expect(addCalendarMonthsToDateOnlyKey("2026-07-29", 0.5)).toBeNull()
      expect(addCalendarMonthsToDateOnlyKey("2026-07-29", Number.NaN)).toBeNull()
      expect(
        addCalendarMonthsToDateOnlyKey("2026-07-29", Number.POSITIVE_INFINITY),
      ).toBeNull()
    })
  })
})
