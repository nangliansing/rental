import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { UploadedMedia } from "../api/uploadToCloudinary"
import type { MediaUploadItem } from "../hooks/useMediaUploader"
import { AvatarUploader } from "./AvatarUploader"

const hookMock = vi.hoisted(() => ({
  useMediaUploader: vi.fn(),
}))

vi.mock("../hooks/useMediaUploader", () => ({
  useMediaUploader: hookMock.useMediaUploader,
}))

const profilePhoto: UploadedMedia = {
  publicId: "profiles/photo",
  secureUrl: "https://example.com/profile.jpg",
  resourceType: "image",
  format: "jpg",
  width: 400,
  height: 400,
  bytes: 80_000,
  position: 0,
  alt: "Profile",
  isCover: false,
}

const actions = {
  addFiles: vi.fn(),
  retryUpload: vi.fn(),
  cancelUpload: vi.fn(),
  removeUpload: vi.fn(),
  resetUploads: vi.fn(),
}

function buildHookState(
  values: Partial<{
    items: MediaUploadItem[]
    uploadedMedia: UploadedMedia[]
    maxFiles: number
    maxFileSizeMb: number
    allowedMimeTypes: string[]
    errorMessage: string
    isUploading: boolean
    hasFailedUpload: boolean
    canUploadMore: boolean
  }> = {},
) {
  return {
    items: [],
    uploadedMedia: [],
    maxFiles: 1,
    maxFileSizeMb: 10,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    errorMessage: "",
    isUploading: false,
    hasFailedUpload: false,
    canUploadMore: true,
    ...actions,
    ...values,
  }
}

describe("AvatarUploader", () => {
  let state = buildHookState()

  beforeEach(() => {
    Object.values(actions).forEach((action) => action.mockReset())
    state = buildHookState()
    hookMock.useMediaUploader.mockReset()
    hookMock.useMediaUploader.mockImplementation(() => state)
  })

  it("renders normalized requirements and uploads a selected profile photo", async () => {
    const user = userEvent.setup()
    state = buildHookState({
      maxFileSizeMb: 6,
      allowedMimeTypes: ["image/jpeg", "image/webp"],
    })
    const { container } = render(
      <AvatarUploader
        label="Your photo"
        description="Help renters recognize you."
        maxFileSizeMb={6}
      />,
    )

    expect(screen.getByText("Your photo")).toBeInTheDocument()
    expect(screen.getByText("JPG, PNG, or WebP up to 6MB.")).toBeInTheDocument()
    const input = container.querySelector('input[type="file"]')
    expect(input).toHaveAttribute("accept", "image/jpeg,image/webp")
    expect(input).toHaveAccessibleDescription(
      "Help renters recognize you. JPG, PNG, or WebP up to 6MB.",
    )

    const file = new File(["photo"], "profile.jpg", { type: "image/jpeg" })
    await user.upload(input as HTMLInputElement, file)

    expect(actions.addFiles).toHaveBeenCalledTimes(1)
    expect(Array.from(actions.addFiles.mock.calls[0][0])).toEqual([file])
    expect(input).toHaveValue("")
  })

  it("shows an existing preview and removes it", async () => {
    const user = userEvent.setup()
    state = buildHookState({
      items: [
        {
          id: profilePhoto.publicId,
          previewUrl: profilePhoto.secureUrl,
          progress: 100,
          status: "success",
          media: profilePhoto,
        },
      ],
      uploadedMedia: [profilePhoto],
    })

    render(<AvatarUploader defaultMedia={profilePhoto} />)

    expect(screen.getByRole("img", { name: "Profile photo preview" })).toHaveAttribute(
      "src",
      profilePhoto.secureUrl,
    )
    expect(screen.getByText("Change photo")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Remove profile photo" }))
    expect(actions.removeUpload).toHaveBeenCalledWith(profilePhoto.publicId)
    expect(hookMock.useMediaUploader).toHaveBeenCalledWith(
      expect.objectContaining({ defaultMedia: [profilePhoto], replaceExisting: true }),
    )
  })

  it("blocks replacement while uploading but keeps cancellation available", () => {
    state = buildHookState({
      isUploading: true,
      items: [
        {
          id: "active-upload",
          file: new File(["photo"], "profile.jpg", { type: "image/jpeg" }),
          previewUrl: "blob:profile",
          progress: 35,
          status: "uploading",
        },
      ],
    })

    const { container } = render(<AvatarUploader />)

    expect(container.querySelector('input[type="file"]')).toBeDisabled()
    expect(screen.getByText("Change photo").closest("label")).toHaveAttribute(
      "aria-disabled",
      "true",
    )
    expect(screen.getByRole("button", { name: "Remove profile photo" })).toBeEnabled()
    expect(
      screen.getByRole("progressbar", { name: "Uploading profile photo" }),
    ).toHaveAttribute("aria-valuenow", "35")
  })

  it("announces failures and exposes retry", async () => {
    const user = userEvent.setup()
    state = buildHookState({
      errorMessage: "Only supported images can be uploaded",
      hasFailedUpload: true,
      items: [
        {
          id: "failed-upload",
          previewUrl: "blob:failed",
          progress: 0,
          status: "error",
          error: "Cloud upload failed",
        },
      ],
    })

    const { container } = render(<AvatarUploader />)

    expect(screen.getAllByRole("alert").map((alert) => alert.textContent)).toEqual([
      "Only supported images can be uploaded",
      "Cloud upload failed",
    ])
    expect(container.querySelector('input[type="file"]')).toHaveAccessibleDescription(
      "JPG, PNG, or WebP up to 10MB. Only supported images can be uploaded Cloud upload failed",
    )

    await user.click(
      screen.getByRole("button", { name: "Retry profile photo upload" }),
    )
    expect(actions.retryUpload).toHaveBeenCalledWith("failed-upload")
  })

  it("notifies consumers when media state changes", async () => {
    const onChange = vi.fn()
    const onUploadStateChange = vi.fn()
    const { rerender } = render(
      <AvatarUploader
        onChange={onChange}
        onUploadStateChange={onUploadStateChange}
      />,
    )

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([]))

    state = buildHookState({ uploadedMedia: [profilePhoto] })
    rerender(
      <AvatarUploader
        onChange={onChange}
        onUploadStateChange={onUploadStateChange}
      />,
    )

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([profilePhoto]))
    expect(onUploadStateChange).toHaveBeenLastCalledWith({
      isUploading: false,
      hasFailedUpload: false,
      media: [profilePhoto],
    })
  })

  it("falls back safely for blank text and malformed default media", () => {
    render(
      <AvatarUploader
        label="   "
        description="   "
        defaultMedia={{ secureUrl: "" } as UploadedMedia}
      />,
    )

    expect(screen.getByText("Profile photo")).toBeInTheDocument()
    const fallback = screen.getByRole("img", {
      name: "Profile photo preview",
    })
    expect(fallback).toBeInTheDocument()
    expect(fallback.querySelector("svg")).toBeInTheDocument()
    expect(hookMock.useMediaUploader).toHaveBeenCalledWith(
      expect.objectContaining({ defaultMedia: [] }),
    )
  })
})
