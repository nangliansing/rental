import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { BuildingForm } from "./BuildingForm"

describe("BuildingForm", () => {
  it("submits normalized create values through accessible controls", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<BuildingForm onSubmit={onSubmit} />)

    const name = screen.getByRole("textbox", { name: "Building name" })
    const type = screen.getByRole("combobox", { name: "Building type" })
    const address = screen.getByRole("textbox", { name: "Address" })
    const submit = screen.getByRole("button", { name: "Continue" })

    expect(name).toBeRequired()
    expect(type).toBeRequired()
    expect(submit).toBeDisabled()

    await user.type(name, "  Riverside Place  ")
    await user.selectOptions(type, "Condo")
    await user.type(address, "  Main Road  ")
    await user.click(screen.getByRole("button", { name: "Parking" }))
    await user.click(screen.getByRole("button", { name: "CCTV" }))
    await user.click(submit)

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Riverside Place",
        buildingType: "Condo",
        facilities: ["Parking"],
        security: ["CCTV"],
        address: "Main Road",
      }),
    )
  })

  it("submits only changed fields in edit mode", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <BuildingForm
        mode="edit"
        defaultValues={{
          name: "Riverside Place",
          buildingType: "Apartment",
          facilities: [],
          security: [],
          address: "Main Road",
        }}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByRole("button", { name: "No changes" })).toBeDisabled()

    await user.click(screen.getByRole("button", { name: "Lift" }))
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ facilities: ["Lift"] }))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "No changes" })).toBeDisabled(),
    )
  })

  it("shows a friendly submission error and re-enables the form", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error("Building could not be saved"))

    render(<BuildingForm onSubmit={onSubmit} />)

    await user.type(
      screen.getByRole("textbox", { name: "Building name" }),
      "Riverside Place",
    )
    await user.click(screen.getByRole("button", { name: "Continue" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Building could not be saved",
    )
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled()
  })

  it("handles missing optional arrays and helper text defensively", () => {
    render(
      <BuildingForm
        mode="edit"
        helperText=""
        defaultValues={{
          name: "Riverside Place",
          facilities: undefined,
          security: undefined,
        }}
      />,
    )

    expect(screen.getByRole("group", { name: "Facilities" })).toBeInTheDocument()
    expect(screen.getByRole("group", { name: "Security" })).toBeInTheDocument()
    expect(screen.queryByText(/permission to add this building/i)).not.toBeInTheDocument()
  })

  it("fills an empty create address from suggestedAddress without overwriting user input", async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <BuildingForm
        defaultValues={{
          name: "Riverside Place",
          buildingType: "Apartment",
        }}
        suggestedAddress={null}
      />,
    )

    const address = screen.getByRole("textbox", { name: "Address" })
    expect(address).toHaveValue("")

    rerender(
      <BuildingForm
        defaultValues={{
          name: "Riverside Place",
          buildingType: "Apartment",
        }}
        suggestedAddress="123 Sukhumvit Rd, Bangkok, Thailand"
      />,
    )

    await waitFor(() =>
      expect(address).toHaveValue("123 Sukhumvit Rd, Bangkok, Thailand"),
    )

    await user.clear(address)
    await user.type(address, "Custom address")
    rerender(
      <BuildingForm
        defaultValues={{
          name: "Riverside Place",
          buildingType: "Apartment",
        }}
        suggestedAddress="Different address"
      />,
    )

    expect(address).toHaveValue("Custom address")
  })

  it("does not apply suggestedAddress in edit mode", async () => {
    render(
      <BuildingForm
        mode="edit"
        defaultValues={{
          name: "Riverside Place",
          buildingType: "Apartment",
          facilities: [],
          security: [],
          address: "",
        }}
        suggestedAddress="123 Sukhumvit Rd, Bangkok, Thailand"
      />,
    )

    expect(screen.getByRole("textbox", { name: "Address" })).toHaveValue("")
  })
})
