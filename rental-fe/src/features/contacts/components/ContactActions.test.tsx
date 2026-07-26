import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ContactActions } from "./ContactActions"

afterEach(() => vi.restoreAllMocks())

describe("ContactActions", () => {
  it("opens the contact modal and redirects from a selected channel", async () => {
    const user = userEvent.setup()
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null)

    render(
      <ContactActions
        contactOwnerName="Nang Lian Sing"
        contacts={{
          lineUrl: "https://line.me/ti/p/abc",
          phone: "0812345678",
        }}
      />,
    )

    await user.click(
      screen.getByRole("button", { name: "Contact Nang Lian Sing" }),
    )

    expect(
      screen.getByRole("dialog", { name: "Contact Nang Lian Sing" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Line" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Phone" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Line" }))

    expect(openSpy).toHaveBeenCalledWith(
      "https://line.me/ti/p/abc",
      "_blank",
      "noopener,noreferrer",
    )
    expect(
      screen.queryByRole("dialog", { name: "Contact Nang Lian Sing" }),
    ).not.toBeInTheDocument()
  })

  it("styles the contact trigger like the save button", () => {
    render(
      <ContactActions
        contactOwnerName="Lister"
        contacts={{ phone: "0812345678" }}
      />,
    )

    const button = screen.getByRole("button", { name: "Contact Lister" })

    expect(button).toHaveClass("size-10", "bg-transparent")
    expect(button).not.toHaveClass("border")
  })

  it("hides the contact trigger when no channels exist", () => {
    render(
      <ContactActions
        contactOwnerName="Lister"
        contacts={{}}
      />,
    )

    expect(
      screen.queryByRole("button", { name: "Contact Lister" }),
    ).not.toBeInTheDocument()
  })

  it("ignores invalid contact data and hides the trigger", () => {
    render(
      <ContactActions
        contactOwnerName="   "
        contacts={{
          phone: "++--",
          lineUrl: "javascript:alert(1)",
          whatsappPhone: null,
        }}
      />,
    )

    expect(
      screen.queryByRole("button", { name: "Contact Lister" }),
    ).not.toBeInTheDocument()
  })

  it("falls back to a safe owner label for invalid names", async () => {
    const user = userEvent.setup()

    render(
      <ContactActions
        contactOwnerName={null}
        contacts={{ phone: "0812345678" }}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Contact Lister" }))

    expect(
      screen.getByRole("dialog", { name: "Contact Lister" }),
    ).toBeInTheDocument()
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
    expect(
      screen.queryByRole("button", { name: "Contact Lister" }),
    ).not.toBeInTheDocument()
  })

  it("renders trailingAction on the right side of the footer", () => {
    render(
      <ContactActions
        contactOwnerName="Lister"
        contacts={{ phone: "0812345678" }}
        trailingAction={
          <button type="button">Explore neighbourhood</button>
        }
      />,
    )

    const footer = screen.getByRole("button", { name: "Contact Lister" })
      .parentElement?.parentElement

    expect(footer).toHaveClass("justify-between")
    expect(
      screen.getByRole("button", { name: "Explore neighbourhood" }),
    ).toBeInTheDocument()
  })

  it("shows directions next to contact when a valid destination is provided", async () => {
    const user = userEvent.setup()
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null)

    render(
      <ContactActions
        contactOwnerName="Lister"
        contacts={{ phone: "0812345678" }}
        directionsDestination={{
          name: "Bangkapi Residence",
          coordinates: [100.6435, 13.7654],
        }}
      />,
    )

    expect(
      screen.getByRole("button", {
        name: "Get directions to Bangkapi Residence",
      }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole("button", {
        name: "Get directions to Bangkapi Residence",
      }),
    )
    await user.click(screen.getByRole("button", { name: "Open Maps" }))

    expect(openSpy).toHaveBeenCalledWith(
      "https://www.google.com/maps/dir/?api=1&destination=13.7654%2C100.6435",
      "_blank",
      "noopener,noreferrer",
    )
  })
})
