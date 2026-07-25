import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Phone } from "lucide-react"
import { describe, expect, it, vi } from "vitest"

import { ContactOptionsDialog } from "./ContactOptionsDialog"

const contacts = [
  {
    type: "line" as const,
    label: "Line",
    href: "https://line.me/ti/p/abc",
    action: "open" as const,
    icon: Phone,
  },
  {
    type: "phone" as const,
    label: "Phone",
    href: "tel:0812345678",
    action: "open" as const,
    icon: Phone,
  },
]

describe("ContactOptionsDialog", () => {
  it("lists contact options and forwards selection", async () => {
    const user = userEvent.setup()
    const onSelectContact = vi.fn()
    const onClose = vi.fn()

    render(
      <ContactOptionsDialog
        contactLinks={contacts}
        contactOwnerName="Nang Lian Sing"
        isOpen
        onClose={onClose}
        onSelectContact={onSelectContact}
      />,
    )

    expect(
      screen.getByRole("dialog", { name: "Contact Nang Lian Sing" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("list", { name: "Contact options" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Line" }))
    expect(onSelectContact).toHaveBeenCalledWith(contacts[0])
    expect(screen.queryByRole("button", { name: /Directions/i })).not.toBeInTheDocument()
  })
})
