import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithProviders } from "@/test/renderWithProviders"

import { AdminWorkspace } from "./AdminWorkspace"

describe("AdminWorkspace", () => {
  it("renders list and detail panes with filters and total", () => {
    renderWithProviders(
      <AdminWorkspace
        title="Pending listings"
        description="Select one submission to inspect."
        total={3}
        filters={<div>Status filters</div>}
        list={<div>Submission list</div>}
        detail={<div>Submission detail</div>}
      />,
    )

    expect(
      screen.getByRole("heading", { name: "Pending listings" }),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Select one submission to inspect."),
    ).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("Status filters")).toBeInTheDocument()
    expect(screen.getByText("Submission list")).toBeInTheDocument()
    expect(screen.getByText("Submission detail")).toBeInTheDocument()
  })
})
