import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ProfileHeaderDetailsBlock } from "./ProfileHeaderDetailsBlock"

describe("ProfileHeaderDetailsBlock", () => {
  it("renders bio metadata and contact chips together", () => {
    render(
      <ProfileHeaderDetailsBlock
        createdAt="2026-07-21T00:00:00.000Z"
        description="Friendly lister"
        languages={["English"]}
        contacts={[
          {
            id: "phone",
            label: "Phone",
            value: "0812345678",
            icon: () => null,
          },
        ]}
      />,
    )

    expect(screen.getByText("Since Jul 2026 · English")).toBeInTheDocument()
    expect(screen.getByText("Friendly lister")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Phone" })).toBeInTheDocument()
  })

  it("supports hiding the empty bio placeholder", () => {
    render(
      <ProfileHeaderDetailsBlock
        contacts={[]}
        description={null}
        emptyBioLabel={null}
      />,
    )

    expect(screen.queryByText("No bio added yet.")).not.toBeInTheDocument()
  })
})
