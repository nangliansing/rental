import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { MAIN_CONTENT_ID, SkipToContentLink } from "./SkipToContentLink"

describe("SkipToContentLink", () => {
  it("moves focus to the main content target", () => {
    render(
      <>
        <SkipToContentLink />
        <main id={MAIN_CONTENT_ID} tabIndex={-1}>
          Content
        </main>
      </>,
    )

    fireEvent.click(screen.getByRole("link", { name: "Skip to main content" }))

    expect(screen.getByRole("main")).toHaveFocus()
  })
})
