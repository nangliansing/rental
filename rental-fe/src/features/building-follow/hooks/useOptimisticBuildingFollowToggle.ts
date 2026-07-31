import { useCallback, useEffect, useRef, useState } from "react"

import type { ActiveToggleSettleOutcome } from "@/shared/components/toggle/ActiveToggleCircleButton"

import { useCreateBuildingFollow } from "../api/useCreateBuildingFollow"
import { useDeleteBuildingFollow } from "../api/useDeleteBuildingFollow"
import { useBuildingFollowingFromCache } from "./useBuildingFollowingFromCache"

type UseOptimisticBuildingFollowToggleInput = {
  buildingId: string
  initialIsFollowing: boolean
  enabled?: boolean
}

type FollowMutationCallbacks = {
  controller: AbortController
  isFollowing: boolean
  operationId: number
}

export function useOptimisticBuildingFollowToggle({
  buildingId,
  initialIsFollowing,
  enabled = true,
}: UseOptimisticBuildingFollowToggleInput) {
  const externalIsFollowing = useBuildingFollowingFromCache({
    buildingId,
    fallbackIsFollowing: initialIsFollowing,
    enabled,
  })
  const [isFollowing, setIsFollowing] = useState(externalIsFollowing)
  const [settleSignal, setSettleSignal] = useState(0)
  const [lastOutcome, setLastOutcome] = useState<ActiveToggleSettleOutcome | null>(
    null,
  )
  const confirmedRef = useRef(externalIsFollowing)
  const desiredRef = useRef(externalIsFollowing)
  const controllerRef = useRef<AbortController | null>(null)
  const latestOperationIdRef = useRef(0)
  const isMountedRef = useRef(true)

  const createFollow = useCreateBuildingFollow()
  const deleteFollow = useDeleteBuildingFollow()
  const isPending = createFollow.isPending || deleteFollow.isPending

  const recordSettle = useCallback((outcome: ActiveToggleSettleOutcome) => {
    if (!isMountedRef.current) return

    setLastOutcome(outcome)
    setSettleSignal((current) => current + 1)
  }, [])

  const applyOptimisticUi = useCallback((nextFollowing: boolean) => {
    desiredRef.current = nextFollowing
    if (isMountedRef.current) setIsFollowing(nextFollowing)
  }, [])

  const handleMutationSuccess = useCallback(
    (isFollowing: boolean, operationId: number, controller: AbortController) => {
      if (
        controller.signal.aborted ||
        operationId !== latestOperationIdRef.current
      ) {
        return
      }

      confirmedRef.current = isFollowing

      if (desiredRef.current !== isFollowing) return

      if (isMountedRef.current) setIsFollowing(isFollowing)
    },
    [],
  )

  const handleMutationError = useCallback(
    (operationId: number, controller: AbortController) => {
      if (
        controller.signal.aborted ||
        operationId !== latestOperationIdRef.current
      ) {
        return
      }

      applyOptimisticUi(confirmedRef.current)
    },
    [applyOptimisticUi],
  )

  const handleMutationSettled = useCallback(
    (
      operationId: number,
      controller: AbortController,
      error: Error | null,
    ) => {
      if (operationId !== latestOperationIdRef.current) return

      controllerRef.current = null

      if (controller.signal.aborted) return

      recordSettle(error ? "error" : "success")
    },
    [recordSettle],
  )

  const runMutation = useCallback(
    ({ controller, isFollowing, operationId }: FollowMutationCallbacks) => {
      const options = {
        onSuccess: () =>
          handleMutationSuccess(isFollowing, operationId, controller),
        onError: () => handleMutationError(operationId, controller),
        onSettled: (_data: unknown, error: Error | null) =>
          handleMutationSettled(operationId, controller, error),
      }
      if (isFollowing) {
        createFollow.mutate(
          {
            buildingId,
            signal: controller.signal,
          },
          options,
        )
        return
      }

      deleteFollow.mutate(
        {
          buildingId,
          signal: controller.signal,
        },
        options,
      )
    },
    [
      buildingId,
      createFollow,
      deleteFollow,
      handleMutationError,
      handleMutationSettled,
      handleMutationSuccess,
    ],
  )

  const toggle = useCallback(() => {
    if (!enabled || isPending) return

    const activeController = controllerRef.current
    if (activeController) {
      activeController.abort()
      controllerRef.current = null
      latestOperationIdRef.current += 1
    }

    const nextFollowing = !desiredRef.current
    applyOptimisticUi(nextFollowing)

    const controller = new AbortController()
    const operationId = latestOperationIdRef.current + 1
    latestOperationIdRef.current = operationId
    controllerRef.current = controller

    runMutation({ controller, isFollowing: nextFollowing, operationId })
  }, [applyOptimisticUi, enabled, isPending, runMutation])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (isPending) return
    if (externalIsFollowing === confirmedRef.current) return

    confirmedRef.current = externalIsFollowing
    desiredRef.current = externalIsFollowing
    setIsFollowing(externalIsFollowing)
  }, [buildingId, externalIsFollowing, isPending])

  return {
    isFollowing,
    isPending,
    settleSignal,
    lastOutcome,
    toggle,
  }
}
