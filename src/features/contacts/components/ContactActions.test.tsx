import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ContactActions } from "./ContactActions"

afterEach(() => vi.restoreAllMocks())

describe("ContactActions directions", () => {
  it("confirms and opens valid building directions", async () => {
    const user = userEvent.setup()
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null)

    render(
      <ContactActions
        contactOwnerName="Lister"
        contacts={{}}
        directions={{
          name: "Bangkapi Residence",
          coordinates: [100.6435, 13.7654],
        }}
      />,
    )

    await user.click(
      screen.getByRole("button", {
        name: "Directions to Bangkapi Residence",
      }),
    )
    expect(
      screen.getByRole("dialog", { name: "Open directions?" }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Open Maps" }))

    expect(openSpy).toHaveBeenCalledWith(
      "https://www.google.com/maps/dir/?api=1&destination=13.7654%2C100.6435",
      "_blank",
      "noopener,noreferrer",
    )
  })

  it("hides directions for invalid coordinates", () => {
    render(
      <ContactActions
        contactOwnerName="Lister"
        contacts={{}}
        directions={{ coordinates: [999, 999] }}
      />,
    )

    expect(screen.queryByText("Directions")).not.toBeInTheDocument()
  })

  it("renders leadingAction when no contact channels exist", () => {
    render(
      <ContactActions
        contactOwnerName="Lister"
        contacts={{}}
        leadingAction={
          <button type="button">Save listing</button>
        }
      />,
    )

    expect(
      screen.getByRole("button", { name: "Save listing" }),
    ).toBeInTheDocument()
    expect(screen.queryByText("Line")).not.toBeInTheDocument()
  })
})
