import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { BuildingSummaryActionBar } from "./BuildingSummaryActionBar"

describe("BuildingSummaryActionBar", () => {
  it("renders management and draft actions when enabled", async () => {
    const user = userEvent.setup()
    const onListHere = vi.fn()
    const onRequestEdit = vi.fn()
    const onEditDraft = vi.fn()

    render(
      <BuildingSummaryActionBar
        editLabel="Request building edit"
        draftEditLabel="Edit building"
        hasManagementActions
        hasDraftEditAction
        onListHere={onListHere}
        onRequestEdit={onRequestEdit}
        onEditDraft={onEditDraft}
      />,
    )

    await user.click(screen.getByRole("button", { name: "List a room here" }))
    await user.click(
      screen.getByRole("button", { name: "Request building edit" }),
    )
    await user.click(screen.getByRole("button", { name: "Edit building" }))

    expect(onListHere).toHaveBeenCalledOnce()
    expect(onRequestEdit).toHaveBeenCalledOnce()
    expect(onEditDraft).toHaveBeenCalledOnce()
  })

  it("renders only management actions", async () => {
    const user = userEvent.setup()
    const onListHere = vi.fn()

    render(
      <BuildingSummaryActionBar
        editLabel="Request building edit"
        draftEditLabel="Edit building"
        hasManagementActions
        hasDraftEditAction={false}
        onListHere={onListHere}
        onRequestEdit={vi.fn()}
      />,
    )

    await user.click(screen.getByRole("button", { name: "List a room here" }))
    expect(onListHere).toHaveBeenCalledOnce()
    expect(
      screen.queryByRole("button", { name: "Edit building" }),
    ).not.toBeInTheDocument()
  })

  it("renders only draft edit action", async () => {
    const user = userEvent.setup()
    const onEditDraft = vi.fn()

    render(
      <BuildingSummaryActionBar
        editLabel="Request building edit"
        draftEditLabel="Edit building"
        hasManagementActions={false}
        hasDraftEditAction
        onEditDraft={onEditDraft}
      />,
    )

    expect(
      screen.queryByRole("button", { name: "List a room here" }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Edit building" }))
    expect(onEditDraft).toHaveBeenCalledOnce()
  })

  it("uses custom action labels", () => {
    render(
      <BuildingSummaryActionBar
        editLabel="Suggest an edit"
        draftEditLabel="Back to building form"
        hasManagementActions
        hasDraftEditAction
        onListHere={vi.fn()}
        onRequestEdit={vi.fn()}
        onEditDraft={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("button", { name: "Suggest an edit" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Back to building form" }),
    ).toBeInTheDocument()
  })

  it("renders nothing when no actions are enabled", () => {
    const { container } = render(
      <BuildingSummaryActionBar
        editLabel="Request building edit"
        draftEditLabel="Edit building"
        hasManagementActions={false}
        hasDraftEditAction={false}
      />,
    )

    expect(container.firstChild).toBeNull()
  })
})
