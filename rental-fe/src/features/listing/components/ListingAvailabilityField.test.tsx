import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ListingAvailabilityField } from "./ListingAvailabilityField"

const referenceDate = new Date("2026-07-29T12:00:00+07:00")

async function openAvailabilityPicker(
  user: ReturnType<typeof userEvent.setup>,
  triggerName: RegExp | string,
) {
  await user.click(screen.getByRole("button", { name: triggerName }))
  return screen.getByRole("dialog", {
    name: "When is the room available?",
  })
}

describe("ListingAvailabilityField", () => {
  it("shows Flexible / Available now / Available from labels", () => {
    const { rerender } = render(
      <ListingAvailabilityField
        value={{ availabilityMode: "flexible", availableFromDate: "" }}
        onChange={vi.fn()}
        referenceDate={referenceDate}
      />,
    )
    expect(screen.getByRole("button", { name: /Flexible/i })).toBeInTheDocument()

    rerender(
      <ListingAvailabilityField
        value={{ availabilityMode: "now", availableFromDate: "" }}
        onChange={vi.fn()}
        referenceDate={referenceDate}
      />,
    )
    expect(
      screen.getByRole("button", { name: /Available now/i }),
    ).toBeInTheDocument()

    rerender(
      <ListingAvailabilityField
        value={{
          availabilityMode: "from_date",
          availableFromDate: "2026-08-15",
        }}
        onChange={vi.fn()}
        referenceDate={referenceDate}
      />,
    )
    expect(
      screen.getByRole("button", { name: /Available from Aug 15, 2026/i }),
    ).toBeInTheDocument()
  })

  it("maps Flexible preset to flexible mode", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <ListingAvailabilityField
        value={{
          availabilityMode: "from_date",
          availableFromDate: "2026-08-15",
        }}
        onChange={onChange}
        referenceDate={referenceDate}
      />,
    )

    const dialog = await openAvailabilityPicker(
      user,
      /Available from Aug 15, 2026/i,
    )
    await user.click(within(dialog).getByRole("button", { name: "Flexible" }))
    expect(onChange).toHaveBeenCalledWith({
      availabilityMode: "flexible",
      availableFromDate: "",
    })
  })

  it("maps Available now preset to now mode", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <ListingAvailabilityField
        value={{ availabilityMode: "flexible", availableFromDate: "" }}
        onChange={onChange}
        referenceDate={referenceDate}
      />,
    )

    const dialog = await openAvailabilityPicker(user, /Flexible/i)
    await user.click(
      within(dialog).getByRole("button", { name: "Available now" }),
    )
    expect(onChange).toHaveBeenCalledWith({
      availabilityMode: "now",
      availableFromDate: "",
    })
  })

  it("maps a future calendar day to from_date", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <ListingAvailabilityField
        value={{ availabilityMode: "flexible", availableFromDate: "" }}
        onChange={onChange}
        referenceDate={referenceDate}
      />,
    )

    const dialog = await openAvailabilityPicker(user, /Flexible/i)
    await user.click(within(dialog).getByRole("button", { name: "Next month" }))
    await user.click(
      within(dialog).getByRole("button", { name: "Aug 15, 2026" }),
    )
    expect(onChange).toHaveBeenCalledWith({
      availabilityMode: "from_date",
      availableFromDate: "2026-08-15",
    })
  })

  it("maps a past calendar day to Available now", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <ListingAvailabilityField
        value={{
          availabilityMode: "from_date",
          availableFromDate: "2026-08-15",
        }}
        onChange={onChange}
        referenceDate={referenceDate}
        disablePast={false}
      />,
    )

    const dialog = await openAvailabilityPicker(
      user,
      /Available from Aug 15, 2026/i,
    )
    await user.click(
      within(dialog).getByRole("button", { name: "Previous month" }),
    )
    await user.click(
      within(dialog).getByRole("button", { name: "Jul 20, 2026" }),
    )
    expect(onChange).toHaveBeenCalledWith({
      availabilityMode: "now",
      availableFromDate: "",
    })
  })

  it("blocks past calendar days by default", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <ListingAvailabilityField
        value={{
          availabilityMode: "from_date",
          availableFromDate: "2026-08-15",
        }}
        onChange={onChange}
        referenceDate={referenceDate}
      />,
    )

    const dialog = await openAvailabilityPicker(
      user,
      /Available from Aug 15, 2026/i,
    )
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

  it("jumps the calendar by contract length and keeps the modal open", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    const { rerender } = render(
      <ListingAvailabilityField
        value={{ availabilityMode: "flexible", availableFromDate: "" }}
        onChange={onChange}
        referenceDate={referenceDate}
      />,
    )

    const dialog = await openAvailabilityPicker(user, /Flexible/i)
    expect(
      within(dialog).getByRole("separator", { hidden: true }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole("group", { name: "Jump by contract length" }),
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: "3 months" }))

    expect(onChange).toHaveBeenCalledWith({
      availabilityMode: "from_date",
      availableFromDate: "2026-10-29",
    })
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(within(dialog).getByText("October 2026")).toBeInTheDocument()

    rerender(
      <ListingAvailabilityField
        value={{
          availabilityMode: "from_date",
          availableFromDate: "2026-10-29",
        }}
        onChange={onChange}
        referenceDate={referenceDate}
      />,
    )

    expect(
      within(dialog).getByRole("button", { name: "Oct 29, 2026" }),
    ).toHaveAttribute("aria-pressed", "true")
  })

  it("treats invalid incoming values as Flexible", () => {
    render(
      <ListingAvailabilityField
        value={
          {
            availabilityMode: "nope",
            availableFromDate: 12,
          } as never
        }
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByRole("button", { name: /Flexible/i })).toBeInTheDocument()
  })

  it("treats invalid from_date strings as empty selection", () => {
    render(
      <ListingAvailabilityField
        value={{
          availabilityMode: "from_date",
          availableFromDate: "not-a-date",
        }}
        onChange={vi.fn()}
        referenceDate={referenceDate}
      />,
    )

    expect(screen.getByRole("button", { name: /Flexible/i })).toBeInTheDocument()
  })

  it("does not open when disabled", async () => {
    const user = userEvent.setup()

    render(
      <ListingAvailabilityField
        value={{ availabilityMode: "flexible", availableFromDate: "" }}
        onChange={vi.fn()}
        disabled
        referenceDate={referenceDate}
      />,
    )

    await user.click(screen.getByRole("button", { name: /Flexible/i }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("does not open when loading or read-only, and surfaces errors", async () => {
    const user = userEvent.setup()

    const { rerender } = render(
      <ListingAvailabilityField
        value={{ availabilityMode: "flexible", availableFromDate: "" }}
        onChange={vi.fn()}
        isLoading
        referenceDate={referenceDate}
      />,
    )

    expect(screen.getByText("Loading")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /Flexible/i }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    rerender(
      <ListingAvailabilityField
        value={{ availabilityMode: "now", availableFromDate: "" }}
        onChange={vi.fn()}
        readOnly
        referenceDate={referenceDate}
      />,
    )
    expect(screen.getByText("View only")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /Available now/i }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    rerender(
      <ListingAvailabilityField
        value={{ availabilityMode: "flexible", availableFromDate: "" }}
        onChange={vi.fn()}
        error="Pick a valid availability date"
        referenceDate={referenceDate}
      />,
    )
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Pick a valid availability date",
    )
  })

  it("clamps a 1-month jump from Jan 31 and keeps the modal open", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const jan31 = new Date("2026-01-31T12:00:00+07:00")

    render(
      <ListingAvailabilityField
        value={{ availabilityMode: "flexible", availableFromDate: "" }}
        onChange={onChange}
        referenceDate={jan31}
      />,
    )

    const dialog = await openAvailabilityPicker(user, /Flexible/i)
    await user.click(within(dialog).getByRole("button", { name: "1 month" }))

    expect(onChange).toHaveBeenCalledWith({
      availabilityMode: "from_date",
      availableFromDate: "2026-02-28",
    })
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(within(dialog).getByText("February 2026")).toBeInTheDocument()
  })
})
