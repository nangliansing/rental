import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { UploadedMedia } from "@/features/uploads/api/uploadToCloudinary"

import { AccountProfileForm } from "./AccountProfileForm"

const sampleProfilePhoto: UploadedMedia = {
  publicId: "users/test-photo",
  secureUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
  resourceType: "image",
  format: "jpg",
  width: 800,
  height: 600,
  bytes: 120000,
  position: 0,
  alt: "User profile photo",
  isCover: false,
}

type UploadState = {
  isUploading: boolean
  hasFailedUpload: boolean
  media: UploadedMedia[]
}

const avatarUploaderMock = vi.hoisted(() => ({
  lastPurpose: null as string | null,
}))

vi.mock("@/features/uploads/components/AvatarUploader", () => ({
  AvatarUploader: ({
    disabled,
    purpose,
    onUploadStateChange,
  }: {
    disabled?: boolean
    purpose?: string
    onUploadStateChange?: (state: UploadState) => void
  }) => {
    avatarUploaderMock.lastPurpose = purpose ?? null

    return (
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
              media: [sampleProfilePhoto],
            })
          }
        >
          Finish photo upload
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
          Clear photo upload
        </button>
      </div>
    )
  },
}))

describe("AccountProfileForm", () => {
  it("uses the account upload purpose", () => {
    render(
      <AccountProfileForm
        defaultValues={{ name: "Jane Doe", profilePhoto: null }}
      />,
    )

    expect(avatarUploaderMock.lastPurpose).toBe("user-profile-photo")
  })

  it("submits only changed name values", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <AccountProfileForm
        defaultValues={{ name: "Before", profilePhoto: null }}
        onSubmit={onSubmit}
      />,
    )

    const nameInput = screen.getByRole("textbox", { name: "Name" })

    expect(nameInput).toBeRequired()
    expect(screen.getByRole("button", { name: "No changes" })).toBeDisabled()

    await user.clear(nameInput)
    await user.type(nameInput, "After")
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ name: "After" }),
    )
    expect(screen.getByRole("button", { name: "No changes" })).toBeDisabled()
  })

  it("submits only changed profilePhoto values", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <AccountProfileForm
        defaultValues={{ name: "Jane Doe", profilePhoto: null }}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Finish photo upload" }))
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        profilePhoto: sampleProfilePhoto,
      }),
    )
  })

  it("submits clearing profilePhoto with null", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <AccountProfileForm
        defaultValues={{ name: "Jane Doe", profilePhoto: sampleProfilePhoto }}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Clear photo upload" }))
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ profilePhoto: null }),
    )
  })

  it("submits combined name and profilePhoto changes", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <AccountProfileForm
        defaultValues={{ name: "Before", profilePhoto: null }}
        onSubmit={onSubmit}
      />,
    )

    await user.clear(screen.getByRole("textbox", { name: "Name" }))
    await user.type(screen.getByRole("textbox", { name: "Name" }), "After")
    await user.click(screen.getByRole("button", { name: "Finish photo upload" }))
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "After",
        profilePhoto: sampleProfilePhoto,
      }),
    )
  })

  it("blocks submit while a photo upload is in progress", async () => {
    const user = userEvent.setup()

    render(
      <AccountProfileForm
        defaultValues={{ name: "Jane Doe", profilePhoto: null }}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Start photo upload" }))

    expect(screen.getByRole("button", { name: "Uploading..." })).toBeDisabled()
  })

  it("blocks submit when a photo upload failed", async () => {
    const user = userEvent.setup()

    render(
      <AccountProfileForm
        defaultValues={{ name: "Jane Doe", profilePhoto: null }}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Fail photo upload" }))

    expect(
      screen.getByText("Remove or retry the failed profile photo first."),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "No changes" })).toBeDisabled()
  })

  it("blocks submit when the trimmed name is empty", async () => {
    const user = userEvent.setup()

    render(
      <AccountProfileForm
        defaultValues={{ name: "Jane Doe", profilePhoto: null }}
      />,
    )

    await user.clear(screen.getByRole("textbox", { name: "Name" }))
    await user.type(screen.getByRole("textbox", { name: "Name" }), "   ")

    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled()
  })

  it("shows submit errors and keeps the edited values", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error("Network error"))

    render(
      <AccountProfileForm
        defaultValues={{ name: "Before", profilePhoto: null }}
        onSubmit={onSubmit}
      />,
    )

    await user.clear(screen.getByRole("textbox", { name: "Name" }))
    await user.type(screen.getByRole("textbox", { name: "Name" }), "After")
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Network error")
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("After")
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled()
  })

  it("disables fields while submitting", async () => {
    const user = userEvent.setup()
    let resolveSubmit!: () => void
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve
        }),
    )

    render(
      <AccountProfileForm
        defaultValues={{ name: "Before", profilePhoto: null }}
        onSubmit={onSubmit}
      />,
    )

    await user.clear(screen.getByRole("textbox", { name: "Name" }))
    await user.type(screen.getByRole("textbox", { name: "Name" }), "After")
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled()
    expect(screen.getByRole("textbox", { name: "Name" })).toBeDisabled()
    expect(screen.getByTestId("avatar-uploader")).toHaveAttribute(
      "data-disabled",
    )

    resolveSubmit!()
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "No changes" })).toBeDisabled(),
    )
  })
})
