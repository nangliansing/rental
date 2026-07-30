import { useCallback, useEffect, useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  createBuildingFollow,
  deleteBuildingFollow,
  isBuildingAlreadyFollowedError,
  isBuildingFollowNotFoundError,
} from "../api"
import {
  BUILDING_FOLLOW_WRITE_SCOPE_ID,
  patchBuildingFollowingStateInCache,
  syncBuildingFollowingState,
} from "../utils/buildingFollowCache"

type FollowMutationInput = {
  controller: AbortController
  isFollowing: boolean
  operationId: number
}

type UseOptimisticBuildingFollowToggleInput = {
  buildingId: string
  initialIsFollowing: boolean
  enabled?: boolean
}

export function useOptimisticBuildingFollowToggle({
  buildingId,
  initialIsFollowing,
  enabled = true,
}: UseOptimisticBuildingFollowToggleInput) {
  const queryClient = useQueryClient()
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const confirmedRef = useRef(initialIsFollowing)
  const desiredRef = useRef(initialIsFollowing)
  const controllerRef = useRef<AbortController | null>(null)
  const latestOperationIdRef = useRef(0)
  const hasLocalToggleRef = useRef(false)
  const isMountedRef = useRef(true)

  const applyOptimisticState = useCallback(
    (nextFollowing: boolean) => {
      desiredRef.current = nextFollowing
      if (isMountedRef.current) setIsFollowing(nextFollowing)
      patchBuildingFollowingStateInCache({
        queryClient,
        buildingId,
        isFollowing: nextFollowing,
      })
    },
    [buildingId, queryClient],
  )

  const mutation = useMutation({
    scope: { id: BUILDING_FOLLOW_WRITE_SCOPE_ID },
    mutationFn: async ({ controller, isFollowing }: FollowMutationInput) => {
      try {
        if (isFollowing) {
          return await createBuildingFollow({
            buildingId,
            signal: controller.signal,
          })
        }

        return await deleteBuildingFollow({
          buildingId,
          signal: controller.signal,
        })
      } catch (error) {
        const serverAlreadyMatches = isFollowing
          ? isBuildingAlreadyFollowedError(error)
          : isBuildingFollowNotFoundError(error)

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

      confirmedRef.current = variables.isFollowing

      if (desiredRef.current !== variables.isFollowing) return

      if (isMountedRef.current) setIsFollowing(variables.isFollowing)
      await syncBuildingFollowingState({
        queryClient,
        buildingId,
        isFollowing: variables.isFollowing,
      })

      if (desiredRef.current !== variables.isFollowing) {
        patchBuildingFollowingStateInCache({
          queryClient,
          buildingId,
          isFollowing: desiredRef.current,
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

      applyOptimisticState(confirmedRef.current)
    },
    onSettled: (_data, _error, variables) => {
      if (variables.operationId !== latestOperationIdRef.current) return
      controllerRef.current = null
    },
  })

  const toggle = useCallback(() => {
    if (!enabled || mutation.isPending) return

    hasLocalToggleRef.current = true

    const activeController = controllerRef.current
    if (activeController) {
      activeController.abort()
      controllerRef.current = null
      latestOperationIdRef.current += 1
    }

    const nextFollowing = !desiredRef.current
    applyOptimisticState(nextFollowing)

    const controller = new AbortController()
    const operationId = latestOperationIdRef.current + 1
    latestOperationIdRef.current = operationId
    controllerRef.current = controller
    mutation.mutate({ controller, isFollowing: nextFollowing, operationId })
  }, [applyOptimisticState, enabled, mutation])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    hasLocalToggleRef.current = false
    confirmedRef.current = initialIsFollowing
    desiredRef.current = initialIsFollowing
    setIsFollowing(initialIsFollowing)
  }, [buildingId])

  useEffect(() => {
    if (mutation.isPending || hasLocalToggleRef.current) return
    if (initialIsFollowing === confirmedRef.current) return

    confirmedRef.current = initialIsFollowing
    desiredRef.current = initialIsFollowing
    setIsFollowing(initialIsFollowing)
  }, [initialIsFollowing, mutation.isPending])

  return {
    isFollowing,
    isPending: mutation.isPending,
    toggle,
  }
}
