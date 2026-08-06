import type { ReactElement, ReactNode } from "react"
import { cloneElement, isValidElement } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ClientRequestDetailActionsMenu } from "./ClientRequestDetailActionsMenu"

vi.mock("@/shared/utils/getModalRoot", () => ({
  getModalRoot: () => document.body,
}))

vi.mock("radix-ui", () => {
  const passthrough = ({ children }: { children: ReactNode }) => children

  const Trigger = ({
    children,
    asChild,
    ...props
  }: {
    children: ReactNode
    asChild?: boolean
  } & Record<string, unknown>) => {
    if (asChild && isValidElement(children)) {
      return cloneElement(children as ReactElement, props)
    }

    return (
      <button type="button" {...props}>
        {children}
      </button>
    )
  }

  const Item = ({
    children,
    onSelect,
    disabled,
    className,
  }: {
    children: ReactNode
    onSelect?: (event: Event) => void
    disabled?: boolean
    className?: string
  }) => (
    <button
      type="button"
      disabled={disabled}
      className={className}
      onClick={() => {
        if (disabled) return
        onSelect?.(new Event("select", { cancelable: true }))
      }}
    >
      {children}
    </button>
  )

  return {
    DropdownMenu: {
      Root: ({ children }: { children: ReactNode }) => <div>{children}</div>,
      Trigger,
      Portal: passthrough,
      Content: ({ children }: { children: ReactNode }) => (
        <div role="menu">{children}</div>
      ),
      Item,
    },
  }
})

describe("ClientRequestDetailActionsMenu", () => {
  it("offers Edit, Close, and Delete for waiting requests", async () => {
    const user = userEvent.setup()
    const onEditRequest = vi.fn()
    const onCloseRequest = vi.fn()
    const onDeleteRequest = vi.fn()

    render(
      <ClientRequestDetailActionsMenu
        status="Waiting"
        onEditRequest={onEditRequest}
        onCloseRequest={onCloseRequest}
        onDeleteRequest={onDeleteRequest}
      />,
    )

    await user.click(
      screen.getByRole("button", { name: "Saved search actions" }),
    )

    const editItem = screen.getByRole("button", { name: /Edit/i })
    expect(editItem.className).toContain("text-base")
    expect(editItem.className).toContain("font-semibold")

    await user.click(editItem)
    expect(onEditRequest).toHaveBeenCalledOnce()

    await user.click(screen.getByRole("button", { name: /Close/i }))
    expect(onCloseRequest).toHaveBeenCalledOnce()

    await user.click(screen.getByRole("button", { name: /Delete/i }))
    expect(onDeleteRequest).toHaveBeenCalledOnce()
  })

  it("disables Edit and Close when status is already Closed", async () => {
    const user = userEvent.setup()
    const onEditRequest = vi.fn()
    const onCloseRequest = vi.fn()

    render(
      <ClientRequestDetailActionsMenu
        status="Closed"
        onEditRequest={onEditRequest}
        onCloseRequest={onCloseRequest}
        onDeleteRequest={vi.fn()}
      />,
    )

    await user.click(
      screen.getByRole("button", { name: "Saved search actions" }),
    )

    const editItem = screen.getByRole("button", { name: /Edit/i })
    const closedItem = screen.getByRole("button", { name: /Closed/i })
    expect(editItem).toBeDisabled()
    expect(closedItem).toBeDisabled()

    await user.click(editItem)
    await user.click(closedItem)
    expect(onEditRequest).not.toHaveBeenCalled()
    expect(onCloseRequest).not.toHaveBeenCalled()
  })
})
