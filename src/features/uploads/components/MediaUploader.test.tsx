import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { UploadedMedia } from "../api/uploadToCloudinary"
import type { MediaUploadItem } from "../hooks/useMediaUploader"
import { MediaUploader } from "./MediaUploader"

const hookMock = vi.hoisted(() => ({
  useMediaUploader: vi.fn(),
}))

vi.mock("../hooks/useMediaUploader", () => ({
  useMediaUploader: hookMock.useMediaUploader,
}))

const uploadedPhoto: UploadedMedia = {
  publicId: "listing/photo",
  secureUrl: "https://example.com/photo.jpg",
  resourceType: "image",
  format: "jpg",
  width: 800,
  height: 600,
  bytes: 120_000,
  position: 0,
  alt: "Room",
  isCover: true,
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
    maxFiles: 20,
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

describe("MediaUploader", () => {
  let state = buildHookState()

  beforeEach(() => {
    Object.values(actions).forEach((action) => action.mockReset())
    state = buildHookState()
    hookMock.useMediaUploader.mockReset()
    hookMock.useMediaUploader.mockImplementation(() => state)
  })

  it("renders normalized limits and passes selected files to the hook", async () => {
    const user = userEvent.setup()
    state = buildHookState({
      maxFiles: 3,
      maxFileSizeMb: 7,
      allowedMimeTypes: ["image/jpeg", "image/webp"],
    })

    const { container } = render(
      <MediaUploader
        purpose="listing-photo"
        label="Listing photos"
        description="Add clear room photos."
      />,
    )

    expect(screen.getByText("Listing photos")).toBeInTheDocument()
    expect(screen.getByText("0/3")).toBeInTheDocument()
    expect(screen.getByText("JPG, PNG, or WebP up to 7MB")).toBeInTheDocument()

    const input = container.querySelector('input[type="file"]')
    expect(input).toHaveAttribute("accept", "image/jpeg,image/webp")
    expect(input).toHaveAttribute("multiple")
    expect(input).toHaveAccessibleDescription("Add clear room photos.")

    const file = new File(["photo"], "room.jpg", { type: "image/jpeg" })
    await user.upload(input as HTMLInputElement, file)

    expect(actions.addFiles).toHaveBeenCalledTimes(1)
    expect(Array.from(actions.addFiles.mock.calls[0][0])).toEqual([file])
    expect(input).toHaveValue("")
  })

  it("renders upload progress with an accessible item status", () => {
    state = buildHookState({
      isUploading: true,
      items: [
        {
          id: "upload-1",
          file: new File(["photo"], "room.jpg", { type: "image/jpeg" }),
          previewUrl: "blob:preview",
          progress: 42,
          status: "uploading",
        },
      ],
    })

    render(<MediaUploader purpose="listing-photo" label="Listing photos" />)

    expect(
      screen.getByRole("list", { name: "Listing photos uploads" }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
    expect(screen.getByText("Add photos")).toBeInTheDocument()
    expect(screen.getByText("19 spaces left")).toBeInTheDocument()
    expect(screen.queryByText("Choose images")).not.toBeInTheDocument()
    expect(screen.getByRole("progressbar", { name: "Uploading room.jpg" })).toHaveAttribute(
      "aria-valuenow",
      "42",
    )
    expect(screen.getByText("Uploading 42%")).toBeInTheDocument()
  })

  it("announces errors and exposes retry and remove actions", async () => {
    const user = userEvent.setup()
    state = buildHookState({
      errorMessage: "Only supported images can be uploaded",
      hasFailedUpload: true,
      items: [
        {
          id: "failed-upload",
          file: new File(["photo"], "broken.jpg", { type: "image/jpeg" }),
          previewUrl: "blob:failed",
          progress: 0,
          status: "error",
          error: "Cloud upload failed",
        },
      ],
    })

    const { container } = render(
      <MediaUploader purpose="listing-photo" label="Listing photos" />,
    )

    expect(screen.getAllByRole("alert").map((alert) => alert.textContent)).toEqual([
      "Only supported images can be uploaded",
      "Cloud upload failed",
    ])
    expect(container.querySelector('input[type="file"]')).toHaveAccessibleDescription(
      "Only supported images can be uploaded",
    )

    await user.click(screen.getByRole("button", { name: "Retry broken.jpg" }))
    await user.click(screen.getByRole("button", { name: "Remove broken.jpg" }))
    expect(actions.retryUpload).toHaveBeenCalledWith("failed-upload")
    expect(actions.removeUpload).toHaveBeenCalledWith("failed-upload")
  })

  it("disables selection and item actions when unavailable", () => {
    state = buildHookState({
      canUploadMore: false,
      items: [
        {
          id: uploadedPhoto.publicId,
          previewUrl: uploadedPhoto.secureUrl,
          progress: 100,
          status: "success",
          media: uploadedPhoto,
        },
      ],
    })

    const { container } = render(
      <MediaUploader purpose="listing-photo" disabled />,
    )

    expect(container.querySelector('input[type="file"]')).toBeDisabled()
    expect(screen.queryByText("Add photos")).not.toBeInTheDocument()
    expect(screen.queryByText("Choose images")).not.toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(1)
    expect(
      screen.getByRole("button", { name: `Remove ${uploadedPhoto.publicId}` }),
    ).toBeDisabled()
  })

  it("notifies consumers with the latest media and upload state", async () => {
    const onChange = vi.fn()
    const onUploadStateChange = vi.fn()
    const { rerender } = render(
      <MediaUploader
        purpose="listing-photo"
        onChange={onChange}
        onUploadStateChange={onUploadStateChange}
      />,
    )

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([]))
    expect(onUploadStateChange).toHaveBeenLastCalledWith({
      isUploading: false,
      hasFailedUpload: false,
      media: [],
    })

    state = buildHookState({
      uploadedMedia: [uploadedPhoto],
      hasFailedUpload: true,
    })
    rerender(
      <MediaUploader
        purpose="listing-photo"
        onChange={onChange}
        onUploadStateChange={onUploadStateChange}
      />,
    )

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([uploadedPhoto]))
    expect(onUploadStateChange).toHaveBeenLastCalledWith({
      isUploading: false,
      hasFailedUpload: true,
      media: [uploadedPhoto],
    })
  })

  it("falls back safely for blank display text", () => {
    render(
      <MediaUploader
        purpose="listing-photo"
        label="   "
        description="   "
      />,
    )

    expect(screen.getByText("Photos")).toBeInTheDocument()
    expect(screen.queryByText(/^\s+$/)).not.toBeInTheDocument()
  })
})
