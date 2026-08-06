import { describe, expect, it } from "vitest"

import {
  buildOpportunityListCues,
  formatOpportunityListTitle,
  formatOpportunityMoveInLabel,
} from "./formatOpportunityListMeta"

describe("formatOpportunityListMeta", () => {
  it("uses geo preview as the primary title", () => {
    expect(
      formatOpportunityListTitle({
        geoSearch: {
          mode: "area",
          placeName: "Siam",
        },
      }),
    ).toBe("Siam")
  })

  it("builds compact first-sight cues", () => {
    expect(
      buildOpportunityListCues({
        filters: {
          bedroomCount: 1,
          minRent: 15000,
          maxRent: 30000,
        },
      }),
    ).toEqual([
      { kind: "bedroom", value: 1, label: "1 bed" },
      { kind: "rent", label: "฿15k–฿30k" },
    ])
  })

  it("uses Studio and includes contract plus occupancy cues", () => {
    expect(
      buildOpportunityListCues({
        filters: {
          bedroomCount: 0,
          contractMonths: 6,
          occupancy: 2,
          minRent: 1000,
          maxRent: 8000,
        },
      }),
    ).toEqual([
      { kind: "bedroom", value: 0, label: "Studio" },
      { kind: "contract", value: 6, label: "6 months" },
      { kind: "occupancy", value: 2, label: "2 people" },
      { kind: "rent", label: "฿1k–฿8k" },
    ])
  })

  it("formats a move-in label from availableBy", () => {
    expect(formatOpportunityMoveInLabel("2026-08-08")).toBe(
      "Wants to move in by Aug 8, 2026",
    )
    expect(formatOpportunityMoveInLabel("2026-08-07T17:00:00.000Z")).toBe(
      "Wants to move in by Aug 8, 2026",
    )
    expect(formatOpportunityMoveInLabel(undefined)).toBeNull()
    expect(formatOpportunityMoveInLabel("bad")).toBeNull()
  })
})
