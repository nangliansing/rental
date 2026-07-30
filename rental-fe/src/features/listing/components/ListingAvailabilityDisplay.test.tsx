import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import * as listingAvailability from "../utils/listingAvailability"
import {
  getListingAvailabilityDisplay,
} from "../utils/listingAvailability"
import {
  LISTING_AVAILABILITY_INDICATOR_CLASS_NAME,
  ListingAvailabilityDisplay,
  type ListingAvailabilityDisplayVariant,
} from "./ListingAvailabilityDisplay"

const referenceDate = new Date("2026-07-29T12:00:00+07:00")

const scenarios = [
  {
    name: "flexible null",
    availableAt: null,
    kind: "flexible" as const,
    visibleText: null,
    ariaLabel: "Flexible",
    isAvailableNow: false,
  },
  {
    name: "flexible invalid",
    availableAt: "not-a-date",
    kind: "flexible" as const,
    visibleText: null,
    ariaLabel: "Flexible",
    isAvailableNow: false,
  },
  {
    name: "available now today ISO",
    availableAt: "2026-07-29T00:00:00+07:00",
    kind: "now" as const,
    visibleText: "Available now",
    ariaLabel: "Available now",
    isAvailableNow: true,
  },
  {
    name: "available now past ISO",
    availableAt: "2026-07-20T00:00:00+07:00",
    kind: "now" as const,
    visibleText: "Available now",
    ariaLabel: "Available now",
    isAvailableNow: true,
  },
  {
    name: "available now date key",
    availableAt: "2026-07-29",
    kind: "now" as const,
    visibleText: "Available now",
    ariaLabel: "Available now",
    isAvailableNow: true,
  },
  {
    name: "future ISO",
    availableAt: "2026-08-15T00:00:00+07:00",
    kind: "from_date" as const,
    visibleText: "Aug 15, 2026",
    compactText: "Aug 15",
    ariaLabel: "Available from Aug 15, 2026",
    isAvailableNow: false,
  },
  {
    name: "future date key",
    availableAt: "2026-08-15",
    kind: "from_date" as const,
    visibleText: "Aug 15, 2026",
    compactText: "Aug 15",
    ariaLabel: "Available from Aug 15, 2026",
    isAvailableNow: false,
  },
] as const

function expectEmpty(container: HTMLElement) {
  expect(container).toBeEmptyDOMElement()
}

describe("ListingAvailabilityDisplay", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(referenceDate)
  })

  describe("scenario matrix", () => {
    it.each(scenarios)(
      "indicator variant for $name",
      ({ availableAt, isAvailableNow, ariaLabel }) => {
        const { container } = render(
          <ListingAvailabilityDisplay
            availableAt={availableAt}
            variant="indicator"
            referenceDate={referenceDate}
          />,
        )

        if (isAvailableNow) {
          expect(screen.getByLabelText(ariaLabel)).toHaveClass(
            LISTING_AVAILABILITY_INDICATOR_CLASS_NAME,
          )
          return
        }

        expectEmpty(container)
      },
    )

    it.each(scenarios)(
      "compact variant for $name",
      ({
        availableAt,
        kind,
        compactText,
        ariaLabel,
        isAvailableNow,
      }) => {
        const { container } = render(
          <ListingAvailabilityDisplay
            availableAt={availableAt}
            variant="compact"
            referenceDate={referenceDate}
          />,
        )

        if (kind === "flexible") {
          expectEmpty(container)
          return
        }

        if (isAvailableNow) {
          expect(screen.getByLabelText(ariaLabel)).toHaveClass(
            LISTING_AVAILABILITY_INDICATOR_CLASS_NAME,
          )
          return
        }

        expect(screen.getByText(compactText!)).toBeInTheDocument()
        expect(screen.getByLabelText(ariaLabel)).toBeInTheDocument()
      },
    )

    it.each(scenarios)(
      "badge variant for $name",
      ({ availableAt, kind, visibleText, ariaLabel, isAvailableNow }) => {
        render(
          <ListingAvailabilityDisplay
            availableAt={availableAt}
            variant="badge"
            referenceDate={referenceDate}
          />,
        )

        const badge = screen.getByLabelText(ariaLabel)
        expect(badge).toHaveTextContent(
          kind === "flexible"
            ? "Flexible"
            : kind === "now"
              ? "Available now"
              : visibleText!,
        )

        if (isAvailableNow) {
          expect(badge).toHaveClass("bg-emerald-600/90")
        } else if (kind === "from_date") {
          expect(badge).toHaveClass("bg-slate-950/45")
        }
      },
    )

    it.each(scenarios)(
      "full variant for $name",
      ({ availableAt, kind, visibleText, ariaLabel }) => {
        render(
          <ListingAvailabilityDisplay
            availableAt={availableAt}
            variant="full"
            referenceDate={referenceDate}
          />,
        )

        const badge = screen.getByLabelText(ariaLabel)
        expect(badge).toHaveTextContent(
          kind === "flexible"
            ? "Flexible"
            : kind === "now"
              ? "Available now"
              : visibleText!,
        )
        expect(badge.querySelector("svg")).toBeInTheDocument()
      },
    )
  })

  describe("defensive inputs", () => {
    const junkInputs = [undefined, 42, {}, [], true, "   "]

    it.each(junkInputs)("treats %p as flexible", (availableAt) => {
      const { container } = render(
        <ListingAvailabilityDisplay
          availableAt={availableAt}
          variant="compact"
          referenceDate={referenceDate}
        />,
      )

      expectEmpty(container)
    })

    it("accepts a precomputed display without recomputing availability", () => {
      const display = getListingAvailabilityDisplay(
        "2026-08-15T00:00:00+07:00",
        referenceDate,
      )
      const displaySpy = vi.spyOn(
        listingAvailability,
        "getListingAvailabilityDisplay",
      )

      render(
        <ListingAvailabilityDisplay display={display} variant="compact" />,
      )

      expect(screen.getByText("Aug 15")).toBeInTheDocument()
      expect(displaySpy).not.toHaveBeenCalled()
    })
  })

  describe("customization", () => {
    it("honors ariaLabel override and className", () => {
      render(
        <ListingAvailabilityDisplay
          availableAt={null}
          variant="badge"
          ariaLabel="Custom label"
          className="custom-badge"
          referenceDate={referenceDate}
        />,
      )

      expect(screen.getByLabelText("Custom label")).toHaveClass("custom-badge")
    })

    it("supports showIcon=false on full variant", () => {
      render(
        <ListingAvailabilityDisplay
          availableAt={null}
          variant="full"
          showIcon={false}
          referenceDate={referenceDate}
        />,
      )

      const badge = screen.getByLabelText("Flexible")
      expect(badge.querySelector("svg")).not.toBeInTheDocument()
    })

    it("supports loading and error status on badge and full variants", () => {
      const variants: ListingAvailabilityDisplayVariant[] = ["badge", "full"]

      for (const variant of variants) {
        const { unmount } = render(
          <ListingAvailabilityDisplay
            availableAt={null}
            variant={variant}
            status="loading"
            referenceDate={referenceDate}
          />,
        )

        expect(screen.getByText("Saving...")).toBeInTheDocument()
        unmount()
      }

      render(
        <ListingAvailabilityDisplay
          availableAt={null}
          variant="full"
          status="error"
          referenceDate={referenceDate}
        />,
      )

      expect(screen.getByLabelText("Flexible")).toHaveClass("bg-rose-600/90")
    })
  })

  describe("Bangkok calendar boundary", () => {
    it("treats UTC evening as the next Bangkok day for now/past checks", () => {
      vi.setSystemTime(new Date("2026-07-28T18:00:00.000Z"))

      render(
        <ListingAvailabilityDisplay
          availableAt="2026-07-29T00:00:00+07:00"
          variant="indicator"
        />,
      )

      expect(screen.getByLabelText("Available now")).toBeInTheDocument()
    })
  })
})
