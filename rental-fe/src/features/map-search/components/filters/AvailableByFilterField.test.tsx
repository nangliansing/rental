import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { AvailableByFilterField } from "./AvailableByFilterField"

const referenceDate = new Date("2026-07-29T12:00:00+07:00")

async function openAvailableByPicker(
  user: ReturnType<typeof userEvent.setup>,
  triggerName: RegExp | string,
) {
  await user.click(screen.getByRole("button", { name: triggerName }))
  return screen.getByRole("dialog", { name: "Need a room by" })
}

describe("AvailableByFilterField", () => {
  it("defaults to Flexible and shows Today / By <date> labels", () => {
    const { rerender } = render(
      <AvailableByFilterField
        value={null}
        onChange={vi.fn()}
        referenceDate={referenceDate}
      />,
    )
    expect(screen.getByRole("button", { name: /Flexible/i })).toBeInTheDocument()

    rerender(
      <AvailableByFilterField
        value="2026-07-29"
        onChange={vi.fn()}
        referenceDate={referenceDate}
      />,
    )
    expect(screen.getByRole("button", { name: /Today/i })).toBeInTheDocument()

    rerender(
      <AvailableByFilterField
        value="2026-08-15"
        onChange={vi.fn()}
        referenceDate={referenceDate}
      />,
    )
    expect(
      screen.getByRole("button", { name: /By Aug 15, 2026/i }),
    ).toBeInTheDocument()
  })

  it("clears the filter with Flexible", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <AvailableByFilterField
        value="2026-08-15"
        onChange={onChange}
        referenceDate={referenceDate}
      />,
    )

    const dialog = await openAvailableByPicker(user, /By Aug 15, 2026/i)
    await user.click(within(dialog).getByRole("button", { name: "Flexible" }))
    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it("sets today from the Today preset", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <AvailableByFilterField
        value={null}
        onChange={onChange}
        referenceDate={referenceDate}
      />,
    )

    const dialog = await openAvailableByPicker(user, /Flexible/i)
    await user.click(within(dialog).getByRole("button", { name: "Today" }))
    expect(onChange).toHaveBeenCalledWith("2026-07-29")
  })

  it("sets a future calendar day", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <AvailableByFilterField
        value={null}
        onChange={onChange}
        referenceDate={referenceDate}
      />,
    )

    const dialog = await openAvailableByPicker(user, /Flexible/i)
    await user.click(within(dialog).getByRole("button", { name: "Next month" }))
    await user.click(
      within(dialog).getByRole("button", { name: "Aug 15, 2026" }),
    )
    expect(onChange).toHaveBeenCalledWith("2026-08-15")
  })

  it("treats invalid values as Flexible", () => {
    render(
      <AvailableByFilterField
        value={"not-a-date" as string}
        onChange={vi.fn()}
        referenceDate={referenceDate}
      />,
    )

    expect(screen.getByRole("button", { name: /Flexible/i })).toBeInTheDocument()
  })

  it("does not open when disabled", async () => {
    const user = userEvent.setup()

    render(
      <AvailableByFilterField
        value={null}
        onChange={vi.fn()}
        disabled
        referenceDate={referenceDate}
      />,
    )

    await user.click(screen.getByRole("button", { name: /Flexible/i }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("does not show contract-length jumps for renters", async () => {
    const user = userEvent.setup()

    render(
      <AvailableByFilterField
        value={null}
        onChange={vi.fn()}
        referenceDate={referenceDate}
      />,
    )

    const dialog = await openAvailableByPicker(user, /Flexible/i)
    expect(within(dialog).queryByRole("separator")).not.toBeInTheDocument()
    expect(
      within(dialog).queryByRole("group", { name: "Jump by contract length" }),
    ).not.toBeInTheDocument()
    expect(
      within(dialog).queryByRole("button", { name: "3 months" }),
    ).not.toBeInTheDocument()
  })

  it("does not open when loading or read-only, and surfaces errors", async () => {
    const user = userEvent.setup()

    const { rerender } = render(
      <AvailableByFilterField
        value={null}
        onChange={vi.fn()}
        isLoading
        referenceDate={referenceDate}
      />,
    )

    expect(screen.getByText("Loading")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /Flexible/i }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    rerender(
      <AvailableByFilterField
        value="2026-07-29"
        onChange={vi.fn()}
        readOnly
        referenceDate={referenceDate}
      />,
    )
    expect(screen.getByText("View only")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /Today/i }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    rerender(
      <AvailableByFilterField
        value={null}
        onChange={vi.fn()}
        error="Choose a move-in date"
        referenceDate={referenceDate}
      />,
    )
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a move-in date")
  })

  it("blocks past days by default", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <AvailableByFilterField
        value="2026-08-15"
        onChange={onChange}
        referenceDate={referenceDate}
      />,
    )

    const dialog = await openAvailableByPicker(user, /By Aug 15, 2026/i)
    await user.click(within(dialog).getByRole("button", { name: "Previous month" }))
    expect(
      within(dialog).getByRole("button", { name: "Jul 20, 2026" }),
    ).toBeDisabled()
    await user.click(
      within(dialog).getByRole("button", { name: "Jul 20, 2026" }),
    )
    expect(onChange).not.toHaveBeenCalled()
  })
})
