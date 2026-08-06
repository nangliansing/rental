import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ModalPortal } from "@/shared/components/ModalPortal"

import { ResponsiveScreenModal } from "./ResponsiveScreenModal"

describe("ResponsiveScreenModal", () => {
  beforeEach(() => {
    document.body.style.overflow = ""
  })

  it("renders nothing when closed", () => {
    const { container } = render(
      <ResponsiveScreenModal
        isOpen={false}
        onClose={vi.fn()}
        ariaLabel="Test modal"
      >
        {() => <p>Modal body</p>}
      </ResponsiveScreenModal>,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("uses a full-screen panel on mobile and a centered panel on desktop", () => {
    render(
      <ResponsiveScreenModal
        isOpen
        onClose={vi.fn()}
        ariaLabel="Listing details"
      >
        {() => <p>Modal body</p>}
      </ResponsiveScreenModal>,
    )

    const dialog = screen.getByRole("dialog", { name: "Listing details" })
    const panel = dialog.querySelector("section")

    expect(panel).toHaveClass("h-dvh", "w-full", "md:max-w-2xl")
    expect(screen.getByText("Modal body")).toBeInTheDocument()
  })

  it("supports a wider desktop layout", () => {
    render(
      <ResponsiveScreenModal
        isOpen
        onClose={vi.fn()}
        ariaLabel="Explore neighbourhood"
        size="wide"
      >
        {() => <p>Explore body</p>}
      </ResponsiveScreenModal>,
    )

    const panel = screen
      .getByRole("dialog", { name: "Explore neighbourhood" })
      .querySelector("section")

    expect(panel).toHaveClass("h-dvh", "md:max-w-4xl")
  })

  it("passes requestClose to modal content", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <ResponsiveScreenModal isOpen onClose={onClose} ariaLabel="Test modal">
        {({ requestClose }) => (
          <button type="button" onClick={requestClose}>
            Close modal
          </button>
        )}
      </ResponsiveScreenModal>,
    )

    await user.click(screen.getByRole("button", { name: "Close modal" }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("exposes a portal host so nested overlays render inside the screen modal", () => {
    render(
      <ResponsiveScreenModal isOpen onClose={vi.fn()} ariaLabel="Test modal">
        {() => (
          <ModalPortal>
            <p>Nested overlay</p>
          </ModalPortal>
        )}
      </ResponsiveScreenModal>,
    )

    const dialog = screen.getByRole("dialog", { name: "Test modal" })
    expect(dialog).toContainElement(screen.getByText("Nested overlay"))
  })
})
