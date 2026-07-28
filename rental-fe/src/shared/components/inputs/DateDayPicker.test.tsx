import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { DateDayPicker } from "./DateDayPicker"

const referenceDate = new Date("2026-08-15T12:00:00+07:00")

async function openPicker(
  user: ReturnType<typeof userEvent.setup>,
  triggerName: RegExp | string,
  modalTitle = "Pick a day",
) {
  await user.click(screen.getByRole("button", { name: triggerName }))
  return screen.getByRole("dialog", { name: modalTitle })
}

describe("DateDayPicker", () => {
  describe("trigger labels", () => {
    it("shows emptyLabel when value is null and no matching preset", () => {
      render(
        <DateDayPicker
          value={null}
          emptyLabel="Select date"
          onChange={vi.fn()}
        />,
      )

      expect(
        screen.getByRole("button", { name: /Select date/i }),
      ).toBeInTheDocument()
    })

    it("prefers matching preset labels over formatted dates", () => {
      render(
        <DateDayPicker
          value="2026-07-29"
          emptyLabel="Any date"
          presets={[
            { id: "any", label: "Any date", value: null },
            { id: "today", label: "Today", value: "2026-07-29" },
          ]}
          onChange={vi.fn()}
        />,
      )

      expect(screen.getByRole("button", { name: /Today/i })).toBeInTheDocument()
    })

    it("uses formatValueLabel for non-preset dates", () => {
      render(
        <DateDayPicker
          value="2026-08-15"
          emptyLabel="Select date"
          formatValueLabel={(value) => `Need by ${value}`}
          onChange={vi.fn()}
        />,
      )

      expect(
        screen.getByRole("button", { name: /Need by 2026-08-15/i }),
      ).toBeInTheDocument()
    })

    it("falls back when formatValueLabel returns blank", () => {
      render(
        <DateDayPicker
          value="2026-08-15"
          emptyLabel="Select date"
          formatValueLabel={() => "   "}
          onChange={vi.fn()}
        />,
      )

      expect(
        screen.getByRole("button", { name: /Aug 15, 2026/i }),
      ).toBeInTheDocument()
    })

    it("treats invalid controlled values as empty", () => {
      render(
        <DateDayPicker
          value={"nope" as string}
          emptyLabel="Select date"
          onChange={vi.fn()}
        />,
      )

      expect(
        screen.getByRole("button", { name: /Select date/i }),
      ).toBeInTheDocument()
    })
  })

  describe("presets", () => {
    it("drops invalid, blank, and duplicate presets", async () => {
      const user = userEvent.setup()

      render(
        <DateDayPicker
          value="2026-08-15"
          emptyLabel="Select date"
          presets={[
            { id: "ok", label: "Clear", value: null },
            { id: "bad", label: "Bad", value: "not-a-date" },
            { id: " ", label: "Blank id", value: null },
            { id: "empty-label", label: "  ", value: null },
            { id: "ok", label: "Duplicate", value: "2026-08-20" },
            null as never,
          ]}
          onChange={vi.fn()}
          modalTitle="Pick a day"
        />,
      )

      const dialog = await openPicker(user, /Aug 15, 2026/i)
      expect(within(dialog).getByRole("button", { name: "Clear" })).toBeInTheDocument()
      expect(within(dialog).queryByRole("button", { name: "Bad" })).not.toBeInTheDocument()
      expect(
        within(dialog).queryByRole("button", { name: "Duplicate" }),
      ).not.toBeInTheDocument()
      expect(
        within(dialog).queryByRole("button", { name: "Blank id" }),
      ).not.toBeInTheDocument()
    })

    it("commits null and date presets", async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(
        <DateDayPicker
          value="2026-08-15"
          emptyLabel="Select date"
          presets={[
            { id: "any", label: "Any", value: null },
            { id: "today", label: "Today", value: "2026-08-15" },
          ]}
          onChange={onChange}
          modalTitle="Pick a day"
          referenceDate={referenceDate}
        />,
      )

      let dialog = await openPicker(user, /Today/i)
      await user.click(within(dialog).getByRole("button", { name: "Any" }))
      expect(onChange).toHaveBeenCalledWith(null)

      onChange.mockClear()
      dialog = await openPicker(user, /Today/i)
      await user.click(within(dialog).getByRole("button", { name: "Today" }))
      // already selected — no redundant onChange
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe("calendar interactions", () => {
    it("commits a selected calendar day and closes", async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(
        <DateDayPicker
          value="2026-08-01"
          emptyLabel="Select date"
          onChange={onChange}
          modalTitle="Pick a day"
          referenceDate={referenceDate}
        />,
      )

      const dialog = await openPicker(user, /Aug 1, 2026/i)
      await user.click(
        within(dialog).getByRole("button", { name: "Aug 20, 2026" }),
      )
      expect(onChange).toHaveBeenCalledWith("2026-08-20")
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("does not emit onChange when re-selecting the same day", async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(
        <DateDayPicker
          value="2026-08-15"
          emptyLabel="Select date"
          onChange={onChange}
          modalTitle="Pick a day"
          referenceDate={referenceDate}
        />,
      )

      const dialog = await openPicker(user, /Aug 15, 2026/i)
      await user.click(
        within(dialog).getByRole("button", { name: "Aug 15, 2026" }),
      )
      expect(onChange).not.toHaveBeenCalled()
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("navigates months and selects a day in the next month", async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(
        <DateDayPicker
          value="2026-08-15"
          emptyLabel="Select date"
          onChange={onChange}
          modalTitle="Pick a day"
          referenceDate={referenceDate}
        />,
      )

      const dialog = await openPicker(user, /Aug 15, 2026/i)
      await user.click(
        within(dialog).getByRole("button", { name: "Next month" }),
      )
      expect(within(dialog).getByText("September 2026")).toBeInTheDocument()
      await user.click(
        within(dialog).getByRole("button", { name: "Sep 2, 2026" }),
      )
      expect(onChange).toHaveBeenCalledWith("2026-09-02")
    })

    it("navigates to the previous month", async () => {
      const user = userEvent.setup()

      render(
        <DateDayPicker
          value="2026-08-15"
          emptyLabel="Select date"
          onChange={vi.fn()}
          modalTitle="Pick a day"
          referenceDate={referenceDate}
        />,
      )

      const dialog = await openPicker(user, /Aug 15, 2026/i)
      await user.click(
        within(dialog).getByRole("button", { name: "Previous month" }),
      )
      expect(within(dialog).getByText("July 2026")).toBeInTheDocument()
    })
  })

  describe("defensive UI states", () => {
    it("does not open when disabled", async () => {
      const user = userEvent.setup()

      render(
        <DateDayPicker
          value={null}
          emptyLabel="Select date"
          disabled
          onChange={vi.fn()}
          modalTitle="Pick a day"
        />,
      )

      await user.click(screen.getByRole("button", { name: /Select date/i }))
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("does not open when loading", async () => {
      const user = userEvent.setup()

      render(
        <DateDayPicker
          value={null}
          emptyLabel="Select date"
          isLoading
          onChange={vi.fn()}
          modalTitle="Pick a day"
        />,
      )

      const trigger = screen.getByRole("button", { name: /Select date/i })
      expect(trigger).toBeDisabled()
      expect(trigger).toHaveAttribute("aria-busy", "true")
      expect(screen.getByText("Loading")).toBeInTheDocument()
      await user.click(trigger)
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("does not open when readOnly", async () => {
      const user = userEvent.setup()

      render(
        <DateDayPicker
          value="2026-08-15"
          emptyLabel="Select date"
          readOnly
          onChange={vi.fn()}
          modalTitle="Pick a day"
        />,
      )

      const trigger = screen.getByRole("button", { name: /Aug 15, 2026/i })
      expect(trigger).toHaveAttribute("aria-readonly", "true")
      expect(screen.getByText("View only")).toBeInTheDocument()
      await user.click(trigger)
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("renders built-in error UI and marks the trigger invalid", () => {
      render(
        <DateDayPicker
          value={null}
          emptyLabel="Select date"
          error="Choose a valid date"
          onChange={vi.fn()}
        />,
      )

      expect(screen.getByRole("alert")).toHaveTextContent("Choose a valid date")
      expect(screen.getByRole("button", { name: /Select date/i })).toHaveAttribute(
        "aria-invalid",
        "true",
      )
    })

    it("disables days outside min/max and blocks past days when requested", async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(
        <DateDayPicker
          value="2026-08-15"
          emptyLabel="Select date"
          onChange={onChange}
          modalTitle="Pick a day"
          referenceDate={referenceDate}
          disablePast
          maxDate="2026-08-20"
        />,
      )

      const dialog = await openPicker(user, /Aug 15, 2026/i)
      // referenceDate is Aug 15, so earlier August days are past.
      expect(
        within(dialog).getByRole("button", { name: "Aug 10, 2026" }),
      ).toBeDisabled()
      expect(
        within(dialog).getByRole("button", { name: "Aug 16, 2026" }),
      ).not.toBeDisabled()
      expect(
        within(dialog).getByRole("button", { name: "Aug 25, 2026" }),
      ).toBeDisabled()

      await user.click(
        within(dialog).getByRole("button", { name: "Previous month" }),
      )
      expect(
        within(dialog).getByRole("button", { name: "Jul 20, 2026" }),
      ).toBeDisabled()
      await user.click(
        within(dialog).getByRole("button", { name: "Jul 20, 2026" }),
      )
      expect(onChange).not.toHaveBeenCalled()
    })

    it("closes without committing when dismissed", async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(
        <DateDayPicker
          value="2026-08-15"
          emptyLabel="Select date"
          onChange={onChange}
          modalTitle="Pick a day"
          referenceDate={referenceDate}
        />,
      )

      const dialog = await openPicker(user, /Aug 15, 2026/i)
      await user.click(within(dialog).getAllByRole("button", { name: "Close" })[0]!)
      expect(onChange).not.toHaveBeenCalled()
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("handles invalid referenceDate by falling back to now", () => {
      render(
        <DateDayPicker
          value={null}
          emptyLabel="Select date"
          referenceDate={new Date("invalid")}
          onChange={vi.fn()}
        />,
      )

      expect(
        screen.getByRole("button", { name: /Select date/i }),
      ).toBeInTheDocument()
    })

    it("exposes dialog trigger accessibility attributes", () => {
      render(
        <DateDayPicker
          id="availability"
          value={null}
          emptyLabel="Select date"
          required
          aria-invalid
          onChange={vi.fn()}
        />,
      )

      const trigger = screen.getByRole("button", { name: /Select date/i })
      expect(trigger).toHaveAttribute("id", "availability")
      expect(trigger).toHaveAttribute("aria-haspopup", "dialog")
      expect(trigger).toHaveAttribute("aria-expanded", "false")
      expect(trigger).toHaveAttribute("aria-required", "true")
      expect(trigger).toHaveAttribute("aria-invalid", "true")
    })
  })

  describe("relative month jumps", () => {
    it("keeps the modal open, jumps the month, and clamps end-of-month days", async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      const jan31 = new Date("2026-01-31T12:00:00+07:00")

      render(
        <DateDayPicker
          value={null}
          emptyLabel="Select date"
          onChange={onChange}
          modalTitle="Pick a day"
          referenceDate={jan31}
          relativeMonthJumps={[
            { id: "1m", label: "1 month", months: 1 },
            { id: "bad", label: "Bad", months: 0.5 },
            { id: "zero", label: "Zero", months: 0 },
          ]}
        />,
      )

      const dialog = await openPicker(user, /Select date/i)
      expect(
        within(dialog).queryByRole("button", { name: "Bad" }),
      ).not.toBeInTheDocument()
      expect(
        within(dialog).queryByRole("button", { name: "Zero" }),
      ).not.toBeInTheDocument()

      await user.click(within(dialog).getByRole("button", { name: "1 month" }))
      expect(onChange).toHaveBeenCalledWith("2026-02-28")
      expect(screen.getByRole("dialog")).toBeInTheDocument()
      expect(within(dialog).getByText("February 2026")).toBeInTheDocument()
    })

    it("disables jumps that land outside maxDate", async () => {
      const user = userEvent.setup()

      render(
        <DateDayPicker
          value={null}
          emptyLabel="Select date"
          onChange={vi.fn()}
          modalTitle="Pick a day"
          referenceDate={referenceDate}
          maxDate="2026-10-01"
          relativeMonthJumps={[
            { id: "1m", label: "1 month", months: 1 },
            { id: "3m", label: "3 months", months: 3 },
          ]}
        />,
      )

      const dialog = await openPicker(user, /Select date/i)
      expect(
        within(dialog).getByRole("button", { name: "1 month" }),
      ).not.toBeDisabled()
      expect(
        within(dialog).getByRole("button", { name: "3 months" }),
      ).toBeDisabled()
    })

    it("disables out-of-range presets while still allowing Flexible null", async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(
        <DateDayPicker
          value="2026-08-16"
          emptyLabel="Select date"
          onChange={onChange}
          modalTitle="Pick a day"
          referenceDate={referenceDate}
          minDate="2026-08-16"
          maxDate="2026-08-20"
          presets={[
            { id: "any", label: "Flexible", value: null },
            { id: "today", label: "Today", value: "2026-08-15" },
            { id: "soon", label: "Soon", value: "2026-08-18" },
          ]}
        />,
      )

      const dialog = await openPicker(user, /Aug 16, 2026/i)
      expect(
        within(dialog).getByRole("button", { name: "Today" }),
      ).toBeDisabled()
      expect(
        within(dialog).getByRole("button", { name: "Soon" }),
      ).not.toBeDisabled()

      await user.click(within(dialog).getByRole("button", { name: "Flexible" }))
      expect(onChange).toHaveBeenCalledWith(null)
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })
})
