import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ListingAvailabilityBadge } from "./ListingAvailabilityBadge"

const referenceDate = new Date("2026-07-29T12:00:00+07:00")

async function pickAvailability(
  user: ReturnType<typeof userEvent.setup>,
  triggerName: RegExp | string,
  optionName: string,
) {
  await user.click(screen.getByRole("button", { name: triggerName }))
  const picker = screen.getByRole("dialog", {
    name: "When is the room available?",
  })
  await user.click(within(picker).getByRole("button", { name: optionName }))
  return picker
}

describe("ListingAvailabilityBadge", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe("display states", () => {
    it("renders Flexible for null availability", () => {
      render(<ListingAvailabilityBadge availableAt={null} />)

      expect(screen.getByLabelText("Flexible")).toHaveClass("bg-black/65")
      expect(screen.queryByRole("button")).not.toBeInTheDocument()
    })

    it("renders Available now for today and past dates", () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

      const { rerender } = render(
        <ListingAvailabilityBadge availableAt="2026-07-29T00:00:00+07:00" />,
      )
      expect(screen.getByLabelText("Available now")).toHaveClass(
        "bg-emerald-600/90",
      )

      rerender(
        <ListingAvailabilityBadge availableAt="2026-07-28T00:00:00+07:00" />,
      )
      expect(screen.getByLabelText("Available now")).toBeInTheDocument()
    })

    it("renders a future date label with inactive overlay styling", () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

      render(
        <ListingAvailabilityBadge availableAt="2026-08-15T00:00:00+07:00" />,
      )

      const badge = screen.getByLabelText("Aug 15, 2026")
      expect(badge).toHaveClass(
        "border-white/15",
        "bg-black/65",
        "text-xs",
        "text-white",
        "backdrop-blur-md",
      )
      expect(badge).not.toHaveClass("bg-emerald-600/90")
    })

    it("accepts YYYY-MM-DD date keys the same as ISO values", () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

      render(<ListingAvailabilityBadge availableAt="2026-08-15" />)

      expect(screen.getByLabelText("Aug 15, 2026")).toBeInTheDocument()
    })
  })

  describe("ownership / interactivity", () => {
    it("stays non-interactive for viewers even if a change handler is passed", () => {
      render(
        <ListingAvailabilityBadge
          availableAt={null}
          isEditable={false}
          onAvailableAtChange={vi.fn()}
        />,
      )

      expect(screen.queryByRole("button")).not.toBeInTheDocument()
      expect(screen.getByLabelText("Flexible")).toBeInTheDocument()
    })

    it("stays non-interactive when editable but no change handler is provided", () => {
      render(<ListingAvailabilityBadge availableAt={null} isEditable />)

      expect(screen.queryByRole("button")).not.toBeInTheDocument()
      expect(screen.getByLabelText("Flexible")).toBeInTheDocument()
    })

    it("opens the date picker directly for owners", async () => {
      const user = userEvent.setup()
      const onAvailableAtChange = vi.fn()

      render(
        <ListingAvailabilityBadge
          availableAt={null}
          isEditable
          referenceDate={referenceDate}
          onAvailableAtChange={onAvailableAtChange}
        />,
      )

      await pickAvailability(
        user,
        "Edit availability: Flexible",
        "Available now",
      )

      expect(onAvailableAtChange).toHaveBeenCalledTimes(1)
      expect(onAvailableAtChange).toHaveBeenCalledWith("2026-07-29")
    })
  })

  describe("owner edits", () => {
    it("emits a future date key when picking a calendar day", async () => {
      const user = userEvent.setup()
      const onAvailableAtChange = vi.fn()

      render(
        <ListingAvailabilityBadge
          availableAt={null}
          isEditable
          referenceDate={referenceDate}
          onAvailableAtChange={onAvailableAtChange}
        />,
      )

      await user.click(
        screen.getByRole("button", { name: "Edit availability: Flexible" }),
      )
      const picker = screen.getByRole("dialog", {
        name: "When is the room available?",
      })
      await user.click(within(picker).getByRole("button", { name: "Next month" }))
      await user.click(
        within(picker).getByRole("button", { name: "Aug 15, 2026" }),
      )

      expect(onAvailableAtChange).toHaveBeenCalledWith("2026-08-15")
    })

    it("emits null when switching from a date to Flexible", async () => {
      const user = userEvent.setup()
      const onAvailableAtChange = vi.fn()

      render(
        <ListingAvailabilityBadge
          availableAt="2026-08-15T00:00:00+07:00"
          isEditable
          referenceDate={referenceDate}
          onAvailableAtChange={onAvailableAtChange}
        />,
      )

      await pickAvailability(
        user,
        "Edit availability: Aug 15, 2026",
        "Flexible",
      )

      expect(onAvailableAtChange).toHaveBeenCalledWith(null)
    })

    it("ignores no-op selections that keep the same date key", async () => {
      const user = userEvent.setup()
      const onAvailableAtChange = vi.fn()

      render(
        <ListingAvailabilityBadge
          availableAt="2026-07-29T00:00:00+07:00"
          isEditable
          referenceDate={referenceDate}
          onAvailableAtChange={onAvailableAtChange}
        />,
      )

      await pickAvailability(
        user,
        "Edit availability: Available now",
        "Available now",
      )

      expect(onAvailableAtChange).not.toHaveBeenCalled()
    })

    it("treats invalid availableAt as Flexible and ignores Flexible no-ops", async () => {
      const user = userEvent.setup()
      const onAvailableAtChange = vi.fn()

      render(
        <ListingAvailabilityBadge
          availableAt={"not-a-date" as unknown as string}
          isEditable
          referenceDate={referenceDate}
          onAvailableAtChange={onAvailableAtChange}
        />,
      )

      await pickAvailability(
        user,
        "Edit availability: Flexible",
        "Flexible",
      )

      expect(onAvailableAtChange).not.toHaveBeenCalled()
    })
  })

  describe("loading and error", () => {
    it("shows Saving... and disables the trigger while submitting", () => {
      render(
        <ListingAvailabilityBadge
          availableAt={null}
          isEditable
          isSubmitting
          onAvailableAtChange={vi.fn()}
        />,
      )

      const button = screen.getByRole("button", { name: "Saving availability" })
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute("aria-busy", "true")
      expect(screen.getByText("Saving...")).toBeInTheDocument()
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })

    it("hides the error alert while a retry is submitting", () => {
      render(
        <ListingAvailabilityBadge
          availableAt={null}
          isEditable
          isSubmitting
          errorMessage="Could not update listing availability."
          onAvailableAtChange={vi.fn()}
        />,
      )

      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
      expect(screen.getByText("Saving...")).toBeInTheDocument()
    })

    it("shows an error alert and keeps retry available", async () => {
      const user = userEvent.setup()

      render(
        <ListingAvailabilityBadge
          availableAt={null}
          isEditable
          referenceDate={referenceDate}
          errorMessage="  Could not update listing availability.  "
          onAvailableAtChange={vi.fn()}
        />,
      )

      expect(screen.getByRole("alert")).toHaveTextContent(
        "Could not update listing availability.",
      )
      expect(
        screen.getByRole("button", {
          name: /Availability update failed\. Flexible\. Tap to retry\./i,
        }),
      ).toBeEnabled()

      await user.click(
        screen.getByRole("button", {
          name: /Availability update failed\. Flexible\. Tap to retry\./i,
        }),
      )
      expect(
        screen.getByRole("dialog", { name: "When is the room available?" }),
      ).toBeInTheDocument()
    })
  })
})
