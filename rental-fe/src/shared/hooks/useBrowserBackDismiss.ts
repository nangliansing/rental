import { useCallback, useEffect, useRef } from "react"

import {
  registerStackEntry,
  requestStackClose,
} from "@/shared/utils/modalHistoryStack"

type UseBrowserBackDismissOptions = {
  enabled?: boolean
}

export function useBrowserBackDismiss(
  isOpen: boolean,
  onDismiss: () => void,
  { enabled = true }: UseBrowserBackDismissOptions = {},
) {
  const onDismissRef = useRef(onDismiss)
  const tokenRef = useRef(Symbol("browser-back-dismiss"))

  useEffect(() => {
    onDismissRef.current = onDismiss
  }, [onDismiss])

  useEffect(() => {
    if (!enabled || !isOpen) return undefined

    return registerStackEntry({
      token: tokenRef.current,
      onClose: () => onDismissRef.current(),
      tracksHistory: true,
    })
  }, [enabled, isOpen])

  return useCallback(() => {
    requestStackClose(tokenRef.current)
  }, [])
}
