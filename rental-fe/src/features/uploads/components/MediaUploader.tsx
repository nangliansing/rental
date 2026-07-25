import { useId } from "react"
import { ImagePlus, RotateCcw, Upload, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ProgressRing } from "@/shared/components/feedback/ProgressRing"
import { OptimizedImage } from "@/shared/components/media/OptimizedImage"

import type { UploadPurpose } from "../api/createUploadSignature"
import type { UploadedMedia } from "../api/uploadToCloudinary"
import {
  useMediaUploader,
  type MediaUploadItem,
} from "../hooks/useMediaUploader"
import {
  useMediaUploaderNotifications,
  type MediaUploaderState,
} from "../hooks/useMediaUploaderNotifications"

type MediaUploaderProps = {
  className?: string
  purpose: UploadPurpose
  label?: string
  description?: string
  maxFiles?: number
  maxFileSizeMb?: number
  replaceExisting?: boolean
  disabled?: boolean
  allowedMimeTypes?: string[]
  defaultMedia?: UploadedMedia[]
  onChange?: (media: UploadedMedia[]) => void
  onUploadStateChange?: (state: MediaUploaderState) => void
}

export type { MediaUploaderState } from "../hooks/useMediaUploaderNotifications"

function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size < 0) return null

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

type MediaUploadPreviewProps = {
  item: MediaUploadItem
  disabled: boolean
  onRemove: (id: string) => void
  onRetry: (id: string) => void
}

type MediaUploadPickerProps = {
  inputId: string
  disabled: boolean
  compact?: boolean
  maxFileSizeMb: number
  remainingFiles: number
}

function MediaUploadPicker({
  inputId,
  disabled,
  compact = false,
  maxFileSizeMb,
  remainingFiles,
}: MediaUploadPickerProps) {
  if (compact) {
    return (
      <label
        role="listitem"
        htmlFor={disabled ? undefined : inputId}
        aria-disabled={disabled}
        className={cn(
          "overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white",
          "cursor-pointer transition-colors hover:bg-slate-50",
          disabled && "cursor-not-allowed opacity-60 hover:bg-white",
        )}
      >
        <span className="flex aspect-square flex-col items-center justify-center px-4 text-center">
          <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <ImagePlus className="h-5 w-5 text-slate-600" />
          </span>
          <span className="text-sm font-medium text-slate-950">Add photos</span>
        </span>
        <span className="block border-t border-slate-100 p-2">
          <span className="block text-xs font-medium text-slate-950">
            {remainingFiles} {remainingFiles === 1 ? "space" : "spaces"} left
          </span>
          <span className="mt-0.5 block text-xs text-slate-500">
            Up to {maxFileSizeMb}MB each
          </span>
        </span>
      </label>
    )
  }

  return (
    <label
      htmlFor={disabled ? undefined : inputId}
      aria-disabled={disabled}
      className={cn(
        "flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 py-5 text-center transition-colors hover:bg-slate-50",
        disabled && "cursor-not-allowed opacity-60 hover:bg-white",
      )}
    >
      <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
        <Upload className="h-5 w-5 text-slate-600" />
      </span>
      <span className="text-sm font-medium text-slate-950">Choose images</span>
      <span className="mt-1 text-xs text-slate-500">
        JPG, PNG, or WebP up to {maxFileSizeMb}MB
      </span>
    </label>
  )
}

function MediaUploadPreview({
  item,
  disabled,
  onRemove,
  onRetry,
}: MediaUploadPreviewProps) {
  const isUploading = item.status === "uploading"
  const canRetry = item.status === "error" || item.status === "canceled"
  const fileName =
    item.file?.name?.trim() || item.media?.publicId?.trim() || "Uploaded image"
  const fileSize = item.file ? formatFileSize(item.file.size) : null
  const itemError = typeof item.error === "string" ? item.error.trim() : ""

  return (
    <div
      role="listitem"
      className="overflow-hidden rounded-lg border border-slate-200 bg-white"
    >
      <div className="relative aspect-square bg-slate-100">
        <OptimizedImage
          src={item.previewUrl}
          alt=""
          className="h-full w-full object-cover"
          width={320}
          height={320}
          sizes="160px"
          responsiveWidths={[160, 320]}
          loading="eager"
          fallback={
            <div className="flex h-full w-full items-center justify-center text-slate-400">
              <ImagePlus aria-hidden="true" className="h-8 w-8" />
              <span className="sr-only">Preview unavailable</span>
            </div>
          }
        />

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20">
            <ProgressRing
              progress={item.progress}
              label={`Uploading ${fileName}`}
            />
          </div>
        )}

        {canRetry && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/25">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-12 w-12 rounded-full bg-white text-slate-950 shadow-sm hover:bg-slate-50"
              disabled={disabled}
              onClick={() => onRetry(item.id)}
              aria-label={`Retry ${fileName}`}
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute right-2 top-2 h-8 w-8 rounded-full bg-white text-slate-950 shadow-sm hover:bg-slate-50"
          disabled={disabled}
          onClick={() => onRemove(item.id)}
          aria-label={`Remove ${fileName}`}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 p-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-950">
            {fileName}
          </p>
          {fileSize && (
            <p className="mt-0.5 text-xs text-slate-500">{fileSize}</p>
          )}
        </div>

        {isUploading && (
          <p className="text-xs font-medium text-slate-500">
            Uploading {item.progress}%
          </p>
        )}

        {itemError && (
          <p className="line-clamp-2 text-xs text-red-600" role="alert">
            {itemError}
          </p>
        )}
      </div>
    </div>
  )
}

export function MediaUploader({
  className,
  purpose,
  label = "Photos",
  description,
  maxFiles,
  maxFileSizeMb,
  replaceExisting,
  disabled = false,
  allowedMimeTypes,
  defaultMedia,
  onChange,
  onUploadStateChange,
}: MediaUploaderProps) {
  const inputId = useId()
  const descriptionId = `${inputId}-description`
  const errorId = `${inputId}-error`
  const shouldReplaceExisting =
    replaceExisting ?? purpose === "agent-profile-photo"

  const uploader = useMediaUploader({
    purpose,
    maxFiles,
    maxFileSizeMb,
    replaceExisting: shouldReplaceExisting,
    allowedMimeTypes,
    defaultMedia,
  })

  const accept = uploader.allowedMimeTypes.join(",")
  const allowMultiple = !shouldReplaceExisting && uploader.maxFiles > 1
  const hasItems = uploader.items.length > 0
  const isPickerDisabled = disabled || !uploader.canUploadMore
  const remainingFiles = Math.max(uploader.maxFiles - uploader.items.length, 0)
  const normalizedLabel = typeof label === "string" ? label.trim() : ""
  const normalizedDescription =
    typeof description === "string" ? description.trim() : ""

  useMediaUploaderNotifications({
    isUploading: uploader.isUploading,
    hasFailedUpload: uploader.hasFailedUpload,
    media: uploader.uploadedMedia,
    onChange,
    onUploadStateChange,
  })

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-950">
            {normalizedLabel || "Photos"}
          </p>

          {normalizedDescription && (
            <p
              id={descriptionId}
              className="mt-1 text-sm leading-5 text-slate-500"
            >
              {normalizedDescription}
            </p>
          )}
        </div>

        <p className="shrink-0 text-xs font-medium text-slate-500">
          {uploader.items.length}/{uploader.maxFiles}
        </p>
      </div>

      <input
        id={inputId}
        name={purpose}
        type="file"
        accept={accept}
        multiple={allowMultiple}
        disabled={disabled || !uploader.canUploadMore}
        aria-describedby={
          [normalizedDescription ? descriptionId : "", uploader.errorMessage ? errorId : ""]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className="sr-only"
        onChange={(event) => {
          if (event.target.files) {
            uploader.addFiles(event.target.files)
          }

          event.target.value = ""
        }}
      />

      {!hasItems && (
        <MediaUploadPicker
          inputId={inputId}
          disabled={isPickerDisabled}
          maxFileSizeMb={uploader.maxFileSizeMb}
          remainingFiles={remainingFiles}
        />
      )}

      {uploader.errorMessage && (
        <p id={errorId} className="text-sm font-medium text-red-600" role="alert">
          {uploader.errorMessage}
        </p>
      )}

      {uploader.items.length > 0 && (
        <div
          role="list"
          aria-label={`${normalizedLabel || "Photos"} uploads`}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {uploader.items.map((item) => (
            <MediaUploadPreview
              key={item.id}
              item={item}
              disabled={disabled}
              onRemove={uploader.removeUpload}
              onRetry={uploader.retryUpload}
            />
          ))}

          {uploader.canUploadMore && (
            <MediaUploadPicker
              compact
              inputId={inputId}
              disabled={disabled}
              maxFileSizeMb={uploader.maxFileSizeMb}
              remainingFiles={remainingFiles}
            />
          )}
        </div>
      )}
    </div>
  )
}
