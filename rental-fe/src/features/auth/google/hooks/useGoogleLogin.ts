import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"

import { establishAuthSession } from "@/features/auth/utils/authSession"
import { getSafeAuthRedirect } from "@/features/auth/utils/getSafeAuthRedirect"

import { loginWithGoogle } from "../api"

export function useGoogleLogin(redirectTo: string) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const safeRedirect = getSafeAuthRedirect(redirectTo)

  const mutation = useMutation({
    scope: { id: "google-login" },
    mutationFn: loginWithGoogle,
    onMutate: async () => {
      await queryClient.cancelQueries()
    },
    onSuccess: ({ accessToken, user }) => {
      establishAuthSession(queryClient, user, accessToken)
      navigate(safeRedirect, { replace: true })
    },
  })

  return {
    error: mutation.error,
    isPending: mutation.isPending,
    login: (credential: string) => mutation.mutate({ credential }),
    reset: mutation.reset,
  }
}
