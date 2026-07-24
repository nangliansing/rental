import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { EditPrivacy } from "./EditPrivacy"

describe("EditPrivacy", () => {
  it("preselects the current visibility and submits only a change", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<EditPrivacy currentVisibility="PUBLIC" onSubmit={onSubmit} />)

    expect(screen.getByRole("radio", { name: /public/i })).toBeChecked()
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()

    await user.click(screen.getByRole("radio", { name: /private/i }))
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith("PRIVATE")
  })

  it("locks the form while saving and displays a normalized error", () => {
    render(
      <EditPrivacy
        currentVisibility="PRIVATE"
        errorMessage="  Could not update listing privacy. Try again.  "
        isSubmitting
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole("radio", { name: /private/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled()
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not update listing privacy. Try again.",
    )
  })

  it("uses a safe public fallback", () => {
    render(<EditPrivacy onSubmit={vi.fn()} />)

    expect(screen.getByRole("radio", { name: /public/i })).toBeChecked()
    expect(
      screen.queryByRole("button", { name: "Cancel" }),
    ).not.toBeInTheDocument()
  })
})
