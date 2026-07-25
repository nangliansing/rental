import { useId } from "react"
import { Camera, RotateCcw, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Avatar } from "@/shared/components/data-display/Avatar"
import { ProgressRing } from "@/shared/components/feedback/ProgressRing"

import type { UploadedMedia } from "../api/uploadToCloudinary"
import { useMediaUploader } from "../hooks/useMediaUploader"
import { useMediaUploaderNotifications } from "../hooks/useMediaUploaderNotifications"
import type { MediaUploaderState } from "./MediaUploader"

type AvatarUploaderProps = {
  className?: string
  label?: string
  description?: string
  maxFileSizeMb?: number
  disabled?: boolean
  allowedMimeTypes?: string[]
  defaultMedia?: UploadedMedia | null
  displayName?: string | null
  onChange?: (media: UploadedMedia[]) => void
  onUploadStateChange?: (state: MediaUploaderState) => void
}

function isUploadedMedia(value: unknown): value is UploadedMedia {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }

  const media = value as Partial<UploadedMedia>
  return (
    typeof media.publicId === "string" &&
    media.publicId.length > 0 &&
    typeof media.secureUrl === "string" &&
    media.secureUrl.length > 0
  )
}

export function AvatarUploader({
  className,
  label = "Profile photo",
  description,
  maxFileSizeMb,
  disabled = false,
  allowedMimeTypes,
  defaultMedia,
  displayName,
  onChange,
  onUploadStateChange,
}: AvatarUploaderProps) {
  const inputId = useId()
  const descriptionId = `${inputId}-description`
  const requirementsId = `${inputId}-requirements`
  const validationErrorId = `${inputId}-validation-error`
  const itemErrorId = `${inputId}-item-error`
  const normalizedDefaultMedia = isUploadedMedia(defaultMedia)
    ? defaultMedia
    : null
  const uploader = useMediaUploader({
    purpose: "agent-profile-photo",
    maxFileSizeMb,
    replaceExisting: true,
    allowedMimeTypes,
    defaultMedia: normalizedDefaultMedia ? [normalizedDefaultMedia] : [],
  })

  const item = uploader.items[0]
  const accept = uploader.allowedMimeTypes.join(",")
  const isUploading = item?.status === "uploading"
  const isDisabled = disabled || isUploading
  const canRetry = item?.status === "error" || item?.status === "canceled"
  const previewUrl =
    typeof item?.previewUrl === "string" ? item.previewUrl.trim() : ""
  const hasImage = previewUrl.length > 0
  const normalizedLabel = typeof label === "string" ? label.trim() : ""
  const displayLabel = normalizedLabel || "Profile photo"
  const normalizedDescription =
    typeof description === "string" ? description.trim() : ""
  const itemError = typeof item?.error === "string" ? item.error.trim() : ""
  const describedBy = [
    normalizedDescription ? descriptionId : "",
    requirementsId,
    uploader.errorMessage ? validationErrorId : "",
    itemError ? itemErrorId : "",
  ]
    .filter(Boolean)
    .join(" ")

  useMediaUploaderNotifications({
    isUploading: uploader.isUploading,
    hasFailedUpload: uploader.hasFailedUpload,
    media: uploader.uploadedMedia,
    onChange,
    onUploadStateChange,
  })

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <p className="text-sm font-medium text-slate-950">{displayLabel}</p>

        {normalizedDescription && (
          <p
            id={descriptionId}
            className="mt-1 text-sm leading-5 text-slate-500"
          >
            {normalizedDescription}
          </p>
        )}
      </div>

      <input
        id={inputId}
        name="profilePhoto"
        type="file"
        accept={accept}
        disabled={isDisabled}
        aria-describedby={describedBy || undefined}
        className="sr-only"
        onChange={(event) => {
          if (event.target.files) {
            uploader.addFiles(event.target.files)
          }

          event.target.value = ""
        }}
      />

      <div className="flex items-center gap-4">
        <div className="relative h-28 w-28 shrink-0">
          <Avatar
            displayName={displayName}
            photo={hasImage ? { secureUrl: previewUrl } : null}
            size="uploader"
            alt={`${displayLabel} preview`}
            loading="eager"
            className="border border-slate-200"
          />

          {item && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-0 top-0 h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
              disabled={disabled}
              onClick={() => uploader.removeUpload(item.id)}
              aria-label="Remove profile photo"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/20">
              <ProgressRing
                progress={item.progress}
                label="Uploading profile photo"
              />
            </div>
          )}

          {canRetry && item && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/25">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-12 w-12 rounded-full bg-white text-slate-950 shadow-sm hover:bg-slate-50"
                disabled={disabled}
                onClick={() => uploader.retryUpload(item.id)}
                aria-label="Retry profile photo upload"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-2">
          <label
            htmlFor={isDisabled ? undefined : inputId}
            aria-disabled={isDisabled}
            className={cn(
              "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-950",
              "hover:bg-slate-50",
              isDisabled && "cursor-not-allowed opacity-50 hover:bg-white"
            )}
          >
            <Camera className="h-4 w-4" />
            {hasImage ? "Change photo" : "Upload photo"}
          </label>

          <p id={requirementsId} className="text-xs leading-5 text-slate-500">
            JPG, PNG, or WebP up to {uploader.maxFileSizeMb}MB.
          </p>

          {uploader.errorMessage && (
            <p
              id={validationErrorId}
              className="text-xs font-medium text-red-600"
              role="alert"
            >
              {uploader.errorMessage}
            </p>
          )}

          {itemError && (
            <p
              id={itemErrorId}
              className="text-xs font-medium text-red-600"
              role="alert"
            >
              {itemError}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
