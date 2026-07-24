import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Grid3X3 } from "lucide-react"

import { ProfileSectionTab } from "./ProfileSectionTab"

describe("ProfileSectionTab", () => {
  it("renders icon and label with active underline styling", () => {
    render(
      <ProfileSectionTab
        isActive
        icon={Grid3X3}
        label="Listings"
        onClick={() => undefined}
      />,
    )

    const tab = screen.getByRole("tab", { name: "Listings" })
    expect(tab).toHaveAttribute("aria-selected", "true")
    expect(tab).toHaveClass("border-b-2", "border-slate-950")
  })
})
