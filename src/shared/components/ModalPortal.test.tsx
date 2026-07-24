import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ModalPortal } from "./ModalPortal"

describe("ModalPortal", () => {
  it("renders children in the application modal root", () => {
    render(
      <ModalPortal>
        <p>Portaled content</p>
      </ModalPortal>,
    )

    const modalRoot = document.getElementById("modal")
    const content = screen.getByText("Portaled content")

    expect(modalRoot).toContainElement(content)
  })

  it("falls back to the document body when no modal root exists", () => {
    document.getElementById("modal")?.remove()

    render(
      <ModalPortal>
        <p>Fallback content</p>
      </ModalPortal>,
    )

    expect(document.body).toContainElement(screen.getByText("Fallback content"))
  })
})
