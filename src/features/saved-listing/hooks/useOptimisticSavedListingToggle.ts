import { useCallback, useEffect, useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useDebouncedCallback } from "use-debounce"

import {
  createSavedListing,
  deleteSavedListing,
  isSavedListingAlreadyExistsError,
  isSavedListingNotFoundError,
} from "../api"
import {
  patchListingSavedStateInCache,
  syncListingSavedState,
} from "../utils/savedListingCache"

const SAVE_TOGGLE_DEBOUNCE_MS = 400

type SaveMutationInput = {
  controller: AbortController
  isSaved: boolean
  operationId: number
}

type UseOptimisticSavedListingToggleInput = {
  initialIsSaved: boolean
  listingId: string
}

export function useOptimisticSavedListingToggle({
  initialIsSaved,
  listingId,
}: UseOptimisticSavedListingToggleInput) {
  const queryClient = useQueryClient()
  const [isSaved, setIsSaved] = useState(initialIsSaved)
  const [isSyncing, setIsSyncing] = useState(false)
  const confirmedRef = useRef(initialIsSaved)
  const desiredRef = useRef(initialIsSaved)
  const controllerRef = useRef<AbortController | null>(null)
  const latestOperationIdRef = useRef(0)
  const serverStateUncertainRef = useRef(false)
  const isMountedRef = useRef(true)

  const applyOptimisticState = useCallback(
    (nextSaved: boolean) => {
      desiredRef.current = nextSaved
      if (isMountedRef.current) setIsSaved(nextSaved)
      patchListingSavedStateInCache({
        queryClient,
        listingId,
        isSaved: nextSaved,
      })
    },
    [listingId, queryClient],
  )

  const mutation = useMutation({
    mutationFn: async ({ controller, isSaved }: SaveMutationInput) => {
      try {
        if (isSaved) {
          return await createSavedListing({
            listingId,
            signal: controller.signal,
          })
        }

        return await deleteSavedListing({
          listingId,
          signal: controller.signal,
        })
      } catch (error) {
        const serverAlreadyMatches = isSaved
          ? isSavedListingAlreadyExistsError(error)
          : isSavedListingNotFoundError(error)

        if (!serverAlreadyMatches) throw error
        return null
      }
    },
    onSuccess: async (_data, variables) => {
      if (
        variables.controller.signal.aborted ||
        variables.operationId !== latestOperationIdRef.current
      ) {
        return
      }

      confirmedRef.current = variables.isSaved
      serverStateUncertainRef.current = false

      if (desiredRef.current !== variables.isSaved) return

      if (isMountedRef.current) setIsSaved(variables.isSaved)
      await syncListingSavedState({
        queryClient,
        listingId,
        isSaved: variables.isSaved,
      })

      // A click can arrive while the saved-list collection is refreshing.
      // Reapply that newer intent so the refetch cannot win the race.
      if (desiredRef.current !== variables.isSaved) {
        patchListingSavedStateInCache({
          queryClient,
          listingId,
          isSaved: desiredRef.current,
        })
      }
    },
    onError: (_error, variables) => {
      if (
        variables.controller.signal.aborted ||
        variables.operationId !== latestOperationIdRef.current
      ) {
        return
      }

      serverStateUncertainRef.current = false
      applyOptimisticState(confirmedRef.current)
    },
    onSettled: (_data, _error, variables) => {
      if (variables.operationId !== latestOperationIdRef.current) return

      controllerRef.current = null
      if (isMountedRef.current) setIsSyncing(false)
    },
  })

  const reconcile = useCallback(() => {
    const requestedState = desiredRef.current
    if (
      !serverStateUncertainRef.current &&
      requestedState === confirmedRef.current
    ) {
      if (isMountedRef.current) setIsSyncing(false)
      return
    }

    const controller = new AbortController()
    const operationId = latestOperationIdRef.current + 1
    latestOperationIdRef.current = operationId
    controllerRef.current = controller
    if (isMountedRef.current) setIsSyncing(true)
    mutation.mutate({ controller, isSaved: requestedState, operationId })
  }, [mutation])

  const debouncedReconcile = useDebouncedCallback(
    reconcile,
    SAVE_TOGGLE_DEBOUNCE_MS,
  )

  const toggle = useCallback(() => {
    const activeController = controllerRef.current
    if (activeController) {
      activeController.abort()
      controllerRef.current = null
      latestOperationIdRef.current += 1
      serverStateUncertainRef.current = true
    }

    const nextSaved = !desiredRef.current
    applyOptimisticState(nextSaved)
    setIsSyncing(
      serverStateUncertainRef.current || nextSaved !== confirmedRef.current,
    )
    debouncedReconcile()
  }, [applyOptimisticState, debouncedReconcile])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      // Do not lose the last optimistic action during navigation.
      debouncedReconcile.flush()
    }
  }, [debouncedReconcile])

  useEffect(() => {
    if (isSyncing || mutation.isPending) return
    if (initialIsSaved === confirmedRef.current) return

    confirmedRef.current = initialIsSaved
    desiredRef.current = initialIsSaved
    setIsSaved(initialIsSaved)
  }, [initialIsSaved, isSyncing, mutation.isPending])

  return {
    isSaved,
    isSyncing,
    toggle,
  }
}
