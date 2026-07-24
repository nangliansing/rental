import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { AgentProfileForm } from "./AgentProfileForm"

type UploadState = {
  isUploading: boolean
  hasFailedUpload: boolean
  media: []
}

vi.mock("../../uploads/components/AvatarUploader", () => ({
  AvatarUploader: ({
    disabled,
    onUploadStateChange,
  }: {
    disabled?: boolean
    onUploadStateChange?: (state: UploadState) => void
  }) => (
    <div data-testid="avatar-uploader" data-disabled={disabled || undefined}>
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onUploadStateChange?.({
            isUploading: true,
            hasFailedUpload: false,
            media: [],
          })
        }
      >
        Start photo upload
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onUploadStateChange?.({
            isUploading: false,
            hasFailedUpload: true,
            media: [],
          })
        }
      >
        Fail photo upload
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onUploadStateChange?.({
            isUploading: false,
            hasFailedUpload: false,
            media: [],
          })
        }
      >
        Finish photo upload
      </button>
    </div>
  ),
}))

describe("AgentProfileForm", () => {
  it("submits normalized create values through accessible required groups", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<AgentProfileForm onSubmit={onSubmit} />)

    const displayName = screen.getByRole("textbox", { name: "Display name" })
    const languages = screen.getByRole("group", { name: "Support languages" })
    const contacts = screen.getByRole("group", { name: "Contact method" })
    const submit = screen.getByRole("button", { name: "Create profile" })

    expect(displayName).toBeRequired()
    expect(languages).toHaveAttribute("aria-required", "true")
    expect(contacts).toHaveAttribute("aria-required", "true")
    expect(contacts).toHaveAccessibleDescription(
      "Add at least one phone or messaging contact renters can use.",
    )
    expect(submit).toBeDisabled()

    await user.type(displayName, "  Nang Rentals  ")
    await user.click(screen.getByRole("button", { name: "English" }))
    expect(submit).toBeDisabled()

    await user.type(screen.getByRole("textbox", { name: "Phone" }), "  +66812345678  ")
    await user.type(screen.getByRole("textbox", { name: "About" }), "  Friendly support  ")
    await user.click(submit)

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        displayName: "Nang Rentals",
        profilePhoto: null,
        description: "Friendly support",
        phone: "+66812345678",
        lineUrl: "",
        whatsappPhone: "",
        telegramUrl: "",
        viberPhone: "",
        supportLanguages: ["English"],
      }),
    )
  })

  it("submits only changed fields in edit mode", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <AgentProfileForm
        mode="edit"
        defaultValues={{
          displayName: "Nang Rentals",
          description: "Original description",
          phone: "+66812345678",
          supportLanguages: ["English"],
        }}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByRole("button", { name: "No changes" })).toBeDisabled()

    const about = screen.getByRole("textbox", { name: "About" })
    await user.clear(about)
    await user.type(about, "Updated description")
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ description: "Updated description" }),
    )
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "No changes" })).toBeDisabled(),
    )
  })

  it("blocks submission during uploads and reports failed uploads", async () => {
    const user = userEvent.setup()

    render(
      <AgentProfileForm
        defaultValues={{
          displayName: "Nang Rentals",
          phone: "+66812345678",
          supportLanguages: ["English"],
        }}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Start photo upload" }))
    expect(screen.getByRole("button", { name: "Uploading..." })).toBeDisabled()

    await user.click(screen.getByRole("button", { name: "Fail photo upload" }))
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Remove or retry the failed profile photo first.",
    )
    expect(screen.getByRole("button", { name: "Create profile" })).toBeDisabled()

    await user.click(screen.getByRole("button", { name: "Finish photo upload" }))
    expect(screen.getByRole("button", { name: "Create profile" })).toBeEnabled()
  })

  it("shows submission errors and handles missing language arrays defensively", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error("Profile could not be saved"))

    render(
      <AgentProfileForm
        defaultValues={{ supportLanguages: undefined }}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByRole("group", { name: "Support languages" })).toBeInTheDocument()

    await user.type(
      screen.getByRole("textbox", { name: "Display name" }),
      "Nang Rentals",
    )
    await user.click(screen.getByRole("button", { name: "Thai" }))
    await user.type(screen.getByRole("textbox", { name: "WhatsApp" }), "+66812345678")
    await user.click(screen.getByRole("button", { name: "Create profile" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Profile could not be saved",
    )
    expect(screen.getByRole("button", { name: "Create profile" })).toBeEnabled()
  })
})
