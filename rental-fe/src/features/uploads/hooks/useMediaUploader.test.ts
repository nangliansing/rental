import { StrictMode, createElement, type ReactNode } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { UploadSignature } from "../api/createUploadSignature"
import type { UploadedMedia } from "../api/uploadToCloudinary"
import { useMediaUploader } from "./useMediaUploader"

const apiMocks = vi.hoisted(() => ({
  createUploadSignature: vi.fn(),
  uploadToCloudinary: vi.fn(),
}))

vi.mock("../api/createUploadSignature", () => ({
  createUploadSignature: apiMocks.createUploadSignature,
}))

vi.mock("../api/uploadToCloudinary", () => ({
  uploadToCloudinary: apiMocks.uploadToCloudinary,
}))

const signature: UploadSignature = {
  cloudName: "cloud",
  apiKey: "key",
  timestamp: 123,
  folder: "listings/user",
  publicId: "signed-public-id",
  signature: "signature",
}

const uploadedPhoto: UploadedMedia = {
  publicId: "listing/uploaded-photo",
  secureUrl: "https://example.com/uploaded.jpg",
  resourceType: "image",
  format: "jpg",
  width: 800,
  height: 600,
  bytes: 100_000,
  position: 8,
  alt: null,
  isCover: false,
}

function deferred<Value>() {
  let resolve!: (value: Value) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}

describe("useMediaUploader", () => {
  const createObjectURL = vi.fn(() => "blob:preview")
  const revokeObjectURL = vi.fn()

  beforeEach(() => {
    apiMocks.createUploadSignature.mockReset()
    apiMocks.uploadToCloudinary.mockReset()
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    })
    apiMocks.createUploadSignature.mockResolvedValue({
      purpose: "listing-photo",
      uploadSignatures: [signature],
    })
  })

  it("normalizes default media, limits, positions, and cover state", () => {
    const secondPhoto = {
      ...uploadedPhoto,
      publicId: "listing/second-photo",
      secureUrl: "https://example.com/second.jpg",
    }
    const { result } = renderHook(() =>
      useMediaUploader({
        purpose: "listing-photo",
        maxFiles: 1.9,
        defaultMedia: [uploadedPhoto, secondPhoto],
      }),
    )

    expect(result.current.maxFiles).toBe(1)
    expect(result.current.items).toHaveLength(1)
    expect(result.current.uploadedMedia).toEqual([
      { ...uploadedPhoto, position: 0, isCover: true },
    ])
    expect(result.current.canUploadMore).toBe(false)
  })

  it("uploads a valid file and clamps unsafe progress values", async () => {
    const upload = deferred<UploadedMedia>()
    apiMocks.uploadToCloudinary.mockReturnValue(upload.promise)
    const { result } = renderHook(() =>
      useMediaUploader({ purpose: "listing-photo" }),
    )
    const file = new File(["photo"], "room.jpg", { type: "image/jpeg" })

    act(() => result.current.addFiles([file]))

    await waitFor(() => expect(result.current.isUploading).toBe(true))
    expect(createObjectURL).toHaveBeenCalledWith(file)
    expect(apiMocks.createUploadSignature).toHaveBeenCalledWith({
      purpose: "listing-photo",
      count: 1,
    })

    act(() => apiMocks.uploadToCloudinary.mock.calls[0][0].onProgress(150))
    expect(result.current.items[0]?.progress).toBe(100)

    await act(async () => upload.resolve(uploadedPhoto))

    await waitFor(() => expect(result.current.isUploading).toBe(false))
    expect(result.current.items[0]).toMatchObject({
      status: "success",
      progress: 100,
      media: uploadedPhoto,
    })
    expect(result.current.uploadedMedia[0]).toMatchObject({
      publicId: uploadedPhoto.publicId,
      position: 0,
      isCover: true,
    })
  })

  it("keeps preview state active during the StrictMode lifecycle check", async () => {
    const upload = deferred<UploadedMedia>()
    apiMocks.uploadToCloudinary.mockReturnValue(upload.promise)
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(StrictMode, null, children)
    const { result } = renderHook(
      () => useMediaUploader({ purpose: "agent-profile-photo" }),
      { wrapper },
    )
    const file = new File(["photo"], "profile.jpg", { type: "image/jpeg" })

    act(() => result.current.addFiles([file]))

    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(result.current.items[0]).toMatchObject({
      file,
      previewUrl: "blob:preview",
    })
    expect(createObjectURL).toHaveBeenCalledWith(file)
  })

  it("rejects invalid files and enforces the configured queue limit", () => {
    const { result } = renderHook(() =>
      useMediaUploader({
        purpose: "listing-photo",
        maxFiles: 1,
        defaultMedia: [uploadedPhoto],
      }),
    )
    const invalidFile = new File(["text"], "notes.txt", { type: "text/plain" })

    act(() => result.current.addFiles([invalidFile]))
    expect(result.current.errorMessage).toBe(
      "Only JPG, PNG, or WebP images are supported",
    )

    const validFile = new File(["photo"], "room.png", { type: "image/png" })
    act(() => result.current.addFiles([validFile]))

    expect(result.current.errorMessage).toBe("You can upload up to 1 images")
    expect(result.current.items).toHaveLength(1)
    expect(apiMocks.uploadToCloudinary).not.toHaveBeenCalled()
  })

  it("keeps a canceled upload canceled when a late upload resolves", async () => {
    const upload = deferred<UploadedMedia>()
    apiMocks.uploadToCloudinary.mockReturnValue(upload.promise)
    const { result } = renderHook(() =>
      useMediaUploader({ purpose: "listing-photo" }),
    )

    act(() =>
      result.current.addFiles([
        new File(["photo"], "room.webp", { type: "image/webp" }),
      ]),
    )
    await waitFor(() => expect(result.current.isUploading).toBe(true))

    const itemId = result.current.items[0]?.id
    const signal = apiMocks.uploadToCloudinary.mock.calls[0][0]
      .signal as AbortSignal
    act(() => result.current.cancelUpload(itemId))

    expect(signal.aborted).toBe(true)
    expect(result.current.items[0]?.status).toBe("canceled")

    await act(async () => upload.resolve(uploadedPhoto))
    await waitFor(() => expect(result.current.isUploading).toBe(false))
    expect(result.current.items[0]?.status).toBe("canceled")
    expect(result.current.items[0]?.media).toBeUndefined()
  })

  it("retries failed uploads and clears their previous error", async () => {
    apiMocks.uploadToCloudinary
      .mockRejectedValueOnce(new Error("Cloud upload failed"))
      .mockResolvedValueOnce(uploadedPhoto)
    const { result } = renderHook(() =>
      useMediaUploader({ purpose: "listing-photo" }),
    )

    act(() =>
      result.current.addFiles([
        new File(["photo"], "room.jpg", { type: "image/jpeg" }),
      ]),
    )
    await waitFor(() => expect(result.current.items[0]?.status).toBe("error"))
    expect(result.current.items[0]?.error).toBe("Cloud upload failed")

    const itemId = result.current.items[0]?.id
    act(() => result.current.retryUpload(itemId))

    await waitFor(() => expect(result.current.items[0]?.status).toBe("success"))
    expect(result.current.items[0]?.error).toBeUndefined()
    expect(apiMocks.uploadToCloudinary).toHaveBeenCalledTimes(2)
  })

  it("revokes local previews when uploads are removed, reset, or unmounted", async () => {
    const firstUpload = deferred<UploadedMedia>()
    const secondUpload = deferred<UploadedMedia>()
    apiMocks.uploadToCloudinary
      .mockReturnValueOnce(firstUpload.promise)
      .mockReturnValueOnce(secondUpload.promise)
    const { result, unmount } = renderHook(() =>
      useMediaUploader({ purpose: "listing-photo" }),
    )

    act(() =>
      result.current.addFiles([
        new File(["first"], "first.jpg", { type: "image/jpeg" }),
      ]),
    )
    await waitFor(() => expect(result.current.items).toHaveLength(1))
    const firstId = result.current.items[0]?.id
    act(() => result.current.removeUpload(firstId))
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:preview")
    expect(result.current.items).toHaveLength(0)

    act(() =>
      result.current.addFiles([
        new File(["second"], "second.jpg", { type: "image/jpeg" }),
      ]),
    )
    await waitFor(() => expect(result.current.items).toHaveLength(1))
    act(() => result.current.resetUploads())
    expect(result.current.items).toHaveLength(0)
    expect(revokeObjectURL).toHaveBeenCalledTimes(2)

    act(() =>
      result.current.addFiles([
        new File(["third"], "third.jpg", { type: "image/jpeg" }),
      ]),
    )
    await waitFor(() => expect(result.current.items).toHaveLength(1))
    unmount()
    expect(revokeObjectURL).toHaveBeenCalledTimes(3)
  })

  it("uses defensive option defaults for malformed runtime input", () => {
    const { result } = renderHook(() =>
      useMediaUploader({
        purpose: "listing-photo",
        maxFiles: Number.NaN,
        maxFileSizeMb: -1,
        allowedMimeTypes: ["", "image/jpeg", "image/jpeg"],
        defaultMedia: undefined,
      }),
    )

    expect(result.current.maxFiles).toBe(20)
    expect(result.current.items).toEqual([])
    expect(result.current.canUploadMore).toBe(true)
  })
})
