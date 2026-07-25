import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import * as openExternalHrefModule from "../utils/openExternalHref"
import { DirectionsAction } from "./DirectionsAction"

afterEach(() => vi.restoreAllMocks())

describe("DirectionsAction", () => {
  it("opens a confirm dialog and launches Google Maps on confirm", async () => {
    const user = userEvent.setup()
    const openSpy = vi
      .spyOn(openExternalHrefModule, "openExternalHref")
      .mockImplementation(() => undefined)

    render(
      <DirectionsAction
        destination={{
          name: "Bangkapi Residence",
          coordinates: [100.6435, 13.7654],
        }}
      />,
    )

    await user.click(
      screen.getByRole("button", {
        name: "Get directions to Bangkapi Residence",
      }),
    )

    expect(
      screen.getByRole("dialog", { name: "Open directions?" }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "Open Google Maps with directions to Bangkapi Residence?",
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Open Maps" }))

    expect(openSpy).toHaveBeenCalledWith(
      "https://www.google.com/maps/dir/?api=1&destination=13.7654%2C100.6435",
    )
    expect(
      screen.queryByRole("dialog", { name: "Open directions?" }),
    ).not.toBeInTheDocument()
  })

  it("hides the trigger when coordinates are invalid", () => {
    render(
      <DirectionsAction
        destination={{
          name: "Bangkapi Residence",
          coordinates: [999, 999],
        }}
      />,
    )

    expect(
      screen.queryByRole("button", { name: /Get directions/i }),
    ).not.toBeInTheDocument()
  })

  it("unmounts the trigger when destination data becomes invalid", () => {
    const { rerender } = render(
      <DirectionsAction
        destination={{
          name: "Bangkapi Residence",
          coordinates: [100.6435, 13.7654],
        }}
      />,
    )

    rerender(
      <DirectionsAction
        destination={{
          name: "Bangkapi Residence",
          coordinates: [999, 999],
        }}
      />,
    )

    expect(
      screen.queryByRole("button", { name: /Get directions/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("dialog", { name: "Open directions?" }),
    ).not.toBeInTheDocument()
  })
})
