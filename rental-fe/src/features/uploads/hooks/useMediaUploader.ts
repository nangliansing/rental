import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  createUploadSignature,
  type UploadPurpose,
} from "../api/createUploadSignature"
import {
  uploadToCloudinary,
  type UploadedMedia,
} from "../api/uploadToCloudinary"

export type MediaUploadStatus =
  | "queued"
  | "uploading"
  | "success"
  | "error"
  | "canceled"

export type MediaUploadItem = {
  id: string
  file?: File
  previewUrl: string
  progress: number
  status: MediaUploadStatus
  media?: UploadedMedia
  error?: string
}

type UseMediaUploaderOptions = {
  purpose: UploadPurpose
  maxFiles?: number
  maxFileSizeMb?: number
  replaceExisting?: boolean
  allowedMimeTypes?: string[]
  defaultMedia?: UploadedMedia[]
}

const DEFAULT_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]
const DEFAULT_MAX_FILE_SIZE_MB = 10

const purposeMaxFiles: Record<UploadPurpose, number> = {
  "agent-profile-photo": 1,
  "listing-photo": 20,
}

function createUploadId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

function normalizePositiveInteger(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback
}

function normalizeAllowedMimeTypes(values: string[] | undefined) {
  if (!Array.isArray(values) || values.length === 0) {
    return DEFAULT_ALLOWED_MIME_TYPES
  }

  const normalizedValues = values.filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  )

  return normalizedValues.length > 0
    ? [...new Set(normalizedValues)]
    : DEFAULT_ALLOWED_MIME_TYPES
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Could not upload file"
}

function revokePreviewUrl(item: MediaUploadItem) {
  if (!item.previewUrl.startsWith("blob:")) return

  URL.revokeObjectURL(item.previewUrl)
}

function createMediaUploadItem(media: UploadedMedia): MediaUploadItem {
  return {
    id: media.publicId,
    previewUrl: media.secureUrl,
    progress: 100,
    status: "success",
    media,
  }
}

export function useMediaUploader({
  purpose,
  maxFiles,
  maxFileSizeMb = DEFAULT_MAX_FILE_SIZE_MB,
  replaceExisting = purpose === "agent-profile-photo",
  allowedMimeTypes = DEFAULT_ALLOWED_MIME_TYPES,
  defaultMedia = [],
}: UseMediaUploaderOptions) {
  const purposeLimit = purposeMaxFiles[purpose]
  const effectiveMaxFiles = Math.min(
    normalizePositiveInteger(maxFiles, purposeLimit),
    purposeLimit,
  )
  const effectiveMaxFileSizeMb = normalizePositiveInteger(
    maxFileSizeMb,
    DEFAULT_MAX_FILE_SIZE_MB,
  )
  const effectiveAllowedMimeTypes = useMemo(
    () => normalizeAllowedMimeTypes(allowedMimeTypes),
    [allowedMimeTypes],
  )

  const [items, setItems] = useState<MediaUploadItem[]>(() =>
    (Array.isArray(defaultMedia) ? defaultMedia : [])
      .slice(0, effectiveMaxFiles)
      .map(createMediaUploadItem),
  )
  const [errorMessage, setErrorMessage] = useState("")
  const itemsRef = useRef<MediaUploadItem[]>(items)
  const abortControllersRef = useRef(new Map<string, AbortController>())
  const isMountedRef = useRef(true)

  const updateItems = useCallback(
    (updater: (currentItems: MediaUploadItem[]) => MediaUploadItem[]) => {
      if (!isMountedRef.current) return

      setItems((currentItems) => {
        const nextItems = updater(currentItems)
        itemsRef.current = nextItems
        return nextItems
      })
    },
    [],
  )

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    isMountedRef.current = true
    const abortControllers = abortControllersRef.current

    return () => {
      isMountedRef.current = false
      abortControllers.forEach((controller) => controller.abort())
      abortControllers.clear()
      itemsRef.current.forEach(revokePreviewUrl)
    }
  }, [])

  const validateFile = useCallback(
    (file: File) => {
      if (!effectiveAllowedMimeTypes.includes(file.type)) {
        return "Only JPG, PNG, or WebP images are supported"
      }

      if (file.size > effectiveMaxFileSizeMb * 1024 * 1024) {
        return `Each image must be ${effectiveMaxFileSizeMb}MB or smaller`
      }

      return null
    },
    [effectiveAllowedMimeTypes, effectiveMaxFileSizeMb],
  )

  const abortUpload = useCallback((id: string) => {
    abortControllersRef.current.get(id)?.abort()
    abortControllersRef.current.delete(id)
  }, [])

  const abortAllUploads = useCallback(() => {
    abortControllersRef.current.forEach((controller) => controller.abort())
    abortControllersRef.current.clear()
  }, [])

  const uploadItem = useCallback(
    async (item: MediaUploadItem) => {
      if (!item.file) {
        return
      }

      const abortController = new AbortController()
      abortControllersRef.current.set(item.id, abortController)

      updateItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === item.id
            ? {
              ...currentItem,
              progress: 0,
              status: "uploading",
              error: undefined,
            }
            : currentItem
        )
      )

      try {
        const { uploadSignatures } = await createUploadSignature({
          purpose,
          count: 1,
        })

        const signature = uploadSignatures[0]

        if (!signature) {
          throw new Error("Upload signature is missing")
        }

        if (abortController.signal.aborted) {
          throw new Error("Upload canceled")
        }

        const media = await uploadToCloudinary({
          file: item.file,
          signature,
          signal: abortController.signal,
          onProgress: (progress) => {
            const normalizedProgress = Number.isFinite(progress)
              ? Math.min(100, Math.max(0, progress))
              : 0

            updateItems((currentItems) =>
              currentItems.map((currentItem) =>
                currentItem.id === item.id
                  ? { ...currentItem, progress: normalizedProgress }
                  : currentItem
              )
            )
          },
        })

        if (abortController.signal.aborted) {
          throw new Error("Upload canceled")
        }

        updateItems((currentItems) =>
          currentItems.map((currentItem) =>
            currentItem.id === item.id
              ? {
                ...currentItem,
                media,
                progress: 100,
                status: "success",
                error: undefined,
              }
              : currentItem
          )
        )
      } catch (error) {
        updateItems((currentItems) =>
          currentItems.map((currentItem) =>
            currentItem.id === item.id
              ? {
                ...currentItem,
                status: abortController.signal.aborted ? "canceled" : "error",
                error: abortController.signal.aborted
                  ? undefined
                  : getErrorMessage(error),
              }
              : currentItem
          )
        )
      } finally {
        abortControllersRef.current.delete(item.id)
      }
    },
    [purpose, updateItems],
  )

  const addFiles = useCallback(
    (files: File[] | FileList) => {
      setErrorMessage("")

      const selectedFiles = files ? Array.from(files) : []

      if (selectedFiles.length === 0) return

      const validFiles: File[] = []

      for (const file of selectedFiles) {
        const validationError = validateFile(file)

        if (validationError) {
          setErrorMessage(validationError)
          continue
        }

        validFiles.push(file)
      }

      if (validFiles.length === 0) return

      const currentCount = replaceExisting ? 0 : itemsRef.current.length
      const remainingCount = effectiveMaxFiles - currentCount
      const acceptedFiles = validFiles.slice(0, Math.max(remainingCount, 0))

      if (acceptedFiles.length < validFiles.length) {
        setErrorMessage(`You can upload up to ${effectiveMaxFiles} images`)
      }

      if (acceptedFiles.length === 0) return

      if (replaceExisting) {
        abortAllUploads()
        updateItems((currentItems) => {
          currentItems.forEach(revokePreviewUrl)
          return []
        })
      }

      const nextItems: MediaUploadItem[] = acceptedFiles.map((file) => ({
        id: createUploadId(),
        file,
        previewUrl: URL.createObjectURL(file),
        progress: 0,
        status: "queued",
      }))

      updateItems((currentItems) =>
        replaceExisting ? nextItems : [...currentItems, ...nextItems]
      )

      nextItems.forEach((item) => {
        void uploadItem(item)
      })
    },
    [
      abortAllUploads,
      effectiveMaxFiles,
      replaceExisting,
      uploadItem,
      updateItems,
      validateFile,
    ],
  )

  const retryUpload = useCallback(
    (id: string) => {
      const item = itemsRef.current.find((currentItem) => currentItem.id === id)

      if (!item || (item.status !== "error" && item.status !== "canceled")) {
        return
      }

      void uploadItem(item)
    },
    [uploadItem],
  )

  const cancelUpload = useCallback(
    (id: string) => {
      abortUpload(id)

      updateItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === id && currentItem.status === "uploading"
            ? { ...currentItem, status: "canceled" }
            : currentItem
        )
      )
    },
    [abortUpload, updateItems],
  )

  const removeUpload = useCallback(
    (id: string) => {
      abortUpload(id)

      updateItems((currentItems) => {
        const item = currentItems.find((currentItem) => currentItem.id === id)

        if (item) {
          revokePreviewUrl(item)
        }

        return currentItems.filter((currentItem) => currentItem.id !== id)
      })
    },
    [abortUpload, updateItems],
  )

  const resetUploads = useCallback(() => {
    abortAllUploads()
    setErrorMessage("")
    updateItems((currentItems) => {
      currentItems.forEach(revokePreviewUrl)
      return []
    })
  }, [abortAllUploads, updateItems])

  const uploadedMedia = useMemo(
    () =>
      items.flatMap((item) => {
        return item.media ? [item.media] : []
      }).map((media, index) => ({
        ...media,
        position: index,
        isCover: purpose === "listing-photo" && index === 0,
      })),
    [items, purpose]
  )

  const isUploading = items.some((item) => item.status === "uploading")
  const hasFailedUpload = items.some(
    (item) => item.status === "error" || item.status === "canceled"
  )
  const canUploadMore = replaceExisting || items.length < effectiveMaxFiles

  return {
    items,
    uploadedMedia,
    maxFiles: effectiveMaxFiles,
    maxFileSizeMb: effectiveMaxFileSizeMb,
    allowedMimeTypes: effectiveAllowedMimeTypes,
    errorMessage,
    isUploading,
    hasFailedUpload,
    canUploadMore,
    addFiles,
    retryUpload,
    cancelUpload,
    removeUpload,
    resetUploads,
  }
}
