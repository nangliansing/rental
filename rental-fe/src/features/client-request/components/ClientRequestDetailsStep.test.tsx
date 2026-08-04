import type { ComponentProps } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ClientRequestDetailsStep } from "./ClientRequestDetailsStep"

function renderStep(
  overrides: Partial<ComponentProps<typeof ClientRequestDetailsStep>> = {},
) {
  const onNameChange = overrides.onNameChange ?? vi.fn()
  const onDescriptionChange = overrides.onDescriptionChange ?? vi.fn()
  const onCancel = overrides.onCancel ?? vi.fn()
  const onContinue = overrides.onContinue ?? vi.fn()

  const result = render(
    <ClientRequestDetailsStep
      formId="client-request-details"
      nameId="client-request-name"
      descriptionId="client-request-notes"
      name=""
      description=""
      summaryTitle="Visible map area"
      summaryDetail="The same area as Search this area on the map."
      onNameChange={onNameChange}
      onDescriptionChange={onDescriptionChange}
      onCancel={onCancel}
      onContinue={onContinue}
      {...overrides}
    />,
  )

  return { ...result, onNameChange, onDescriptionChange, onCancel, onContinue }
}

describe("ClientRequestDetailsStep", () => {
  describe("content", () => {
    it("shows the geo summary and detail fields", () => {
      renderStep({
        name: "Family search",
        description: "LINE: family01",
      })

      expect(screen.getByText("Visible map area")).toBeInTheDocument()
      expect(
        screen.getByText("The same area as Search this area on the map."),
      ).toBeInTheDocument()
      expect(screen.getByLabelText(/^Name/)).toHaveValue("Family search")
      expect(screen.getByLabelText(/^Notes$/)).toHaveValue("LINE: family01")
    })

    it("forwards field errors to the details fields", () => {
      renderStep({
        errors: { name: "Enter a name for this request." },
      })

      expect(screen.getByRole("alert")).toHaveTextContent(
        "Enter a name for this request.",
      )
      expect(screen.getByLabelText(/^Name/)).toHaveAttribute(
        "aria-invalid",
        "true",
      )
    })

    it("renders optional footerStart content before the actions", () => {
      renderStep({
        footerStart: <span data-testid="footer-start">Draft saved</span>,
      })

      const footerStart = screen.getByTestId("footer-start")
      const cancel = screen.getByRole("button", { name: "Cancel" })

      expect(footerStart.compareDocumentPosition(cancel)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      )
    })
  })

  describe("field changes", () => {
    it("forwards name and notes edits to the parent", async () => {
      const user = userEvent.setup()
      const { onNameChange, onDescriptionChange } = renderStep()

      await user.type(screen.getByLabelText(/^Name/), "A")
      await user.type(screen.getByLabelText(/^Notes$/), "B")

      expect(onNameChange).toHaveBeenCalledWith("A")
      expect(onDescriptionChange).toHaveBeenCalledWith("B")
    })
  })

  describe("continue", () => {
    it("calls onContinue when Continue is clicked", async () => {
      const user = userEvent.setup()
      const { onContinue } = renderStep()

      await user.click(screen.getByRole("button", { name: "Continue" }))

      expect(onContinue).toHaveBeenCalledTimes(1)
    })

    it("calls onContinue when the form is submitted", () => {
      const { onContinue } = renderStep({ formId: "details-form" })

      fireEvent.submit(document.getElementById("details-form")!)

      expect(onContinue).toHaveBeenCalledTimes(1)
    })

    it("uses a custom continue label", async () => {
      const user = userEvent.setup()
      const { onContinue } = renderStep({ continueLabel: "Next" })

      await user.click(screen.getByRole("button", { name: "Next" }))

      expect(onContinue).toHaveBeenCalledTimes(1)
      expect(
        screen.queryByRole("button", { name: "Continue" }),
      ).not.toBeInTheDocument()
    })
  })

  describe("cancel", () => {
    it("calls onCancel when Cancel is clicked", async () => {
      const user = userEvent.setup()
      const { onCancel, onContinue } = renderStep()

      await user.click(screen.getByRole("button", { name: "Cancel" }))

      expect(onCancel).toHaveBeenCalledTimes(1)
      expect(onContinue).not.toHaveBeenCalled()
    })

    it("uses a custom cancel label", async () => {
      const user = userEvent.setup()
      const { onCancel } = renderStep({ cancelLabel: "Discard" })

      await user.click(screen.getByRole("button", { name: "Discard" }))

      expect(onCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe("disabled / submitting", () => {
    it("disables fields and actions while disabled", () => {
      renderStep({ disabled: true })

      expect(screen.getByLabelText(/^Name/)).toBeDisabled()
      expect(screen.getByLabelText(/^Notes$/)).toBeDisabled()
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
      expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled()
    })

    it("does not call onContinue on submit while disabled", () => {
      const { onContinue } = renderStep({
        disabled: true,
        formId: "details-form",
      })

      fireEvent.submit(document.getElementById("details-form")!)

      expect(onContinue).not.toHaveBeenCalled()
    })

    it("does not call onCancel when the disabled cancel button is clicked", async () => {
      const user = userEvent.setup()
      const { onCancel } = renderStep({ disabled: true })

      await user.click(screen.getByRole("button", { name: "Cancel" }))

      expect(onCancel).not.toHaveBeenCalled()
    })
  })

  describe("form attributes", () => {
    it("marks the form as noValidate so browser validation does not run", () => {
      renderStep({ formId: "details-form" })

      expect(document.getElementById("details-form")).toHaveAttribute(
        "novalidate",
      )
    })
  })
})
