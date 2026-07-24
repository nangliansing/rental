import { useEffect, useRef } from "react"

import type { UploadedMedia } from "../api/uploadToCloudinary"

export type MediaUploaderState = {
  isUploading: boolean
  hasFailedUpload: boolean
  media: UploadedMedia[]
}

type UseMediaUploaderNotificationsOptions = MediaUploaderState & {
  onChange?: (media: UploadedMedia[]) => void
  onUploadStateChange?: (state: MediaUploaderState) => void
}

export function useMediaUploaderNotifications({
  isUploading,
  hasFailedUpload,
  media,
  onChange,
  onUploadStateChange,
}: UseMediaUploaderNotificationsOptions) {
  const onChangeRef = useRef(onChange)
  const onUploadStateChangeRef = useRef(onUploadStateChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    onUploadStateChangeRef.current = onUploadStateChange
  }, [onUploadStateChange])

  useEffect(() => {
    onChangeRef.current?.(media)
  }, [media])

  useEffect(() => {
    onUploadStateChangeRef.current?.({
      isUploading,
      hasFailedUpload,
      media,
    })
  }, [hasFailedUpload, isUploading, media])
}
