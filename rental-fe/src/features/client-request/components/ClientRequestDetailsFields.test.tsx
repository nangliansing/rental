import type { ComponentProps } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
  CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH,
  CLIENT_REQUEST_NAME_MAX_LENGTH,
} from "../api/createOwnerClientRequest"
import { ClientRequestDetailsFields } from "./ClientRequestDetailsFields"

function renderFields(
  overrides: Partial<ComponentProps<typeof ClientRequestDetailsFields>> = {},
) {
  const onNameChange = overrides.onNameChange ?? vi.fn()
  const onDescriptionChange = overrides.onDescriptionChange ?? vi.fn()

  const result = render(
    <ClientRequestDetailsFields
      name=""
      description=""
      nameId="client-request-name"
      descriptionId="client-request-notes"
      onNameChange={onNameChange}
      onDescriptionChange={onDescriptionChange}
      {...overrides}
    />,
  )

  return { ...result, onNameChange, onDescriptionChange }
}

describe("ClientRequestDetailsFields", () => {
  describe("labels and placeholders", () => {
    it("renders Name as required and Notes as optional", () => {
      renderFields()

      const name = screen.getByLabelText(/^Name/)
      const notes = screen.getByLabelText(/^Notes$/)

      expect(name).toBeRequired()
      expect(notes).not.toBeRequired()
      expect(screen.getByText("*")).toBeInTheDocument()
    })

    it("shows the expected placeholders", () => {
      renderFields()

      expect(
        screen.getByPlaceholderText("e.g. Quiet 2BR near BTS"),
      ).toBeInTheDocument()
      expect(
        screen.getByPlaceholderText(
          "Reminders for yourself — must-haves, budget notes…",
        ),
      ).toBeInTheDocument()
    })
  })

  describe("controlled values", () => {
    it("displays the provided name and notes", () => {
      renderFields({
        name: "Family near Bang Kapi",
        description: "LINE: family01",
      })

      expect(screen.getByLabelText(/^Name/)).toHaveValue(
        "Family near Bang Kapi",
      )
      expect(screen.getByLabelText(/^Notes$/)).toHaveValue("LINE: family01")
    })

    it("wires name and notes changes to the parent handlers", async () => {
      const user = userEvent.setup()
      const { onNameChange, onDescriptionChange } = renderFields()

      await user.type(screen.getByLabelText(/^Name/), "Family")
      await user.type(screen.getByLabelText(/^Notes$/), "LINE")

      expect(onNameChange).toHaveBeenCalled()
      expect(onNameChange).toHaveBeenLastCalledWith("y")
      expect(onDescriptionChange).toHaveBeenCalled()
      expect(onDescriptionChange).toHaveBeenLastCalledWith("E")
    })

    it("calls onNameChange with the full typed character sequence", async () => {
      const user = userEvent.setup()
      const onNameChange = vi.fn()
      renderFields({ onNameChange })

      await user.type(screen.getByLabelText(/^Name/), "Ab")

      expect(onNameChange.mock.calls.map((call) => call[0])).toEqual(["A", "b"])
    })
  })

  describe("maxLength contracts", () => {
    it("caps name and notes at the API max lengths", () => {
      renderFields()

      expect(screen.getByLabelText(/^Name/)).toHaveAttribute(
        "maxLength",
        String(CLIENT_REQUEST_NAME_MAX_LENGTH),
      )
      expect(screen.getByLabelText(/^Notes$/)).toHaveAttribute(
        "maxLength",
        String(CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH),
      )
    })
  })

  describe("errors", () => {
    it("shows a name error and marks the name field invalid", () => {
      renderFields({
        errors: { name: "Enter a name for this search." },
      })

      expect(screen.getByRole("alert")).toHaveTextContent(
        "Enter a name for this search.",
      )
      expect(screen.getByLabelText(/^Name/)).toHaveAttribute(
        "aria-invalid",
        "true",
      )
      expect(screen.getByLabelText(/^Notes$/)).not.toHaveAttribute(
        "aria-invalid",
      )
    })

    it("shows a notes error and marks the notes field invalid", () => {
      renderFields({
        errors: {
          description: `Notes must be at most ${CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH} characters.`,
        },
      })

      expect(screen.getByRole("alert")).toHaveTextContent(
        `Notes must be at most ${CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH} characters.`,
      )
      expect(screen.getByLabelText(/^Notes$/)).toHaveAttribute(
        "aria-invalid",
        "true",
      )
      expect(screen.getByLabelText(/^Name/)).not.toHaveAttribute("aria-invalid")
    })

    it("can show name and notes errors together", () => {
      renderFields({
        errors: {
          name: "Enter a name for this search.",
          description: `Notes must be at most ${CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH} characters.`,
        },
      })

      expect(screen.getAllByRole("alert")).toHaveLength(2)
      expect(screen.getByLabelText(/^Name/)).toHaveAttribute(
        "aria-invalid",
        "true",
      )
      expect(screen.getByLabelText(/^Notes$/)).toHaveAttribute(
        "aria-invalid",
        "true",
      )
    })

    it("does not render alerts when errors are absent", () => {
      renderFields()

      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })

    it("associates error text with the field via aria-describedby", () => {
      renderFields({
        errors: { name: "Enter a name for this search." },
      })

      const name = screen.getByLabelText(/^Name/)
      const describedBy = name.getAttribute("aria-describedby")

      expect(describedBy).toBeTruthy()
      expect(document.getElementById(describedBy!)).toHaveTextContent(
        "Enter a name for this search.",
      )
    })
  })

  describe("disabled state", () => {
    it("disables both fields while submitting or read-only", () => {
      renderFields({ disabled: true })

      expect(screen.getByLabelText(/^Name/)).toBeDisabled()
      expect(screen.getByLabelText(/^Notes$/)).toBeDisabled()
    })

    it("keeps fields enabled by default", () => {
      renderFields()

      expect(screen.getByLabelText(/^Name/)).toBeEnabled()
      expect(screen.getByLabelText(/^Notes$/)).toBeEnabled()
    })
  })

  describe("ids", () => {
    it("uses the provided control ids", () => {
      renderFields({
        nameId: "create-name",
        descriptionId: "create-notes",
      })

      expect(screen.getByLabelText(/^Name/)).toHaveAttribute("id", "create-name")
      expect(screen.getByLabelText(/^Notes$/)).toHaveAttribute(
        "id",
        "create-notes",
      )
    })
  })
})
