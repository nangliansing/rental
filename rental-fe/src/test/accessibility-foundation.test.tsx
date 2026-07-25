import { render } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, it, vi } from "vitest"

import { ConfirmationDialog } from "@/shared/components/dialogs/ConfirmationDialog"
import { RouteAccessibility } from "@/shared/components/navigation/RouteAccessibility"
import {
  MAIN_CONTENT_ID,
  SkipToContentLink,
} from "@/shared/components/navigation/SkipToContentLink"

import { assertNoAccessibilityViolations } from "./assertNoAccessibilityViolations"

describe("accessibility foundation", () => {
  it("has no detectable structural WCAG violations", async () => {
    render(
      <MemoryRouter>
        <SkipToContentLink />
        <RouteAccessibility />
        <main id={MAIN_CONTENT_ID} tabIndex={-1}>
          <h1>Search rentals</h1>
        </main>
      </MemoryRouter>,
    )

    await assertNoAccessibilityViolations()
  })

  it("has no detectable dialog WCAG violations", async () => {
    render(
      <ConfirmationDialog
        isOpen
        title="Delete listing?"
        description="This listing will no longer be visible."
        confirmLabel="Delete"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    await assertNoAccessibilityViolations()
  })
})
