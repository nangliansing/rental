import { createRef } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Button } from "./button"

describe("Button", () => {
  it("renders a defensive non-submit button by default", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())

    render(
      <form onSubmit={onSubmit}>
        <Button>Open options</Button>
      </form>,
    )

    const button = screen.getByRole("button", { name: "Open options" })

    expect(button).toHaveAttribute("type", "button")
    expect(button).toHaveAttribute("data-variant", "default")
    expect(button).toHaveAttribute("data-size", "default")

    await user.click(button)

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("preserves explicit submit behavior", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())

    render(
      <form onSubmit={onSubmit}>
        <Button type="submit">Save</Button>
      </form>,
    )

    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it("forwards refs and native attributes", () => {
    const ref = createRef<HTMLButtonElement>()

    render(
      <Button ref={ref} name="action" value="approve" aria-label="Approve">
        Approve
      </Button>,
    )

    expect(ref.current).toBe(screen.getByRole("button", { name: "Approve" }))
    expect(ref.current).toHaveAttribute("name", "action")
    expect(ref.current).toHaveAttribute("value", "approve")
  })

  it("blocks native button actions while disabled", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(
      <Button disabled onClick={onClick}>
        Delete
      </Button>,
    )

    const button = screen.getByRole("button", { name: "Delete" })
    expect(button).toBeDisabled()

    await user.click(button)

    expect(onClick).not.toHaveBeenCalled()
  })

  it("composes an accessible link without leaking button attributes", () => {
    render(
      <Button asChild variant="outline" size="lg">
        <a href="/profile">Open profile</a>
      </Button>,
    )

    const link = screen.getByRole("link", { name: "Open profile" })

    expect(link).toHaveAttribute("href", "/profile")
    expect(link).not.toHaveAttribute("type")
    expect(link).toHaveAttribute("data-variant", "outline")
    expect(link).toHaveAttribute("data-size", "lg")
  })

  it("makes a disabled asChild link unfocusable and non-interactive", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(
      <Button asChild disabled>
        <a href="/profile" onClick={onClick}>
          Open profile
        </a>
      </Button>,
    )

    const link = screen.getByRole("link", { name: "Open profile" })

    expect(link).toHaveAttribute("aria-disabled", "true")
    expect(link).toHaveAttribute("tabindex", "-1")

    await user.click(link)

    expect(onClick).not.toHaveBeenCalled()
  })

  it("applies variants and resolves conflicting utility classes", () => {
    render(
      <Button variant="destructive" size="icon" className="h-12" aria-label="Remove">
        X
      </Button>,
    )

    const button = screen.getByRole("button", { name: "Remove" })

    expect(button).toHaveClass("bg-destructive/10", "h-12")
    expect(button).not.toHaveClass("h-8")
  })
})
