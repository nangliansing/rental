import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"

import { disableGoogleAutoSelect } from "@/features/auth/google/lib/googleIdentity"

import { logout } from "../api/logout"
import { clearAuthSession } from "../utils/authSession"

type UseLogoutOptions = {
  redirectTo?: string | null
}

export function useLogout({ redirectTo = "/login" }: UseLogoutOptions = {}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    scope: { id: "logout" },
    mutationFn: logout,
    onMutate: async () => {
      await queryClient.cancelQueries()
    },
    onSettled: () => {
      disableGoogleAutoSelect()
      clearAuthSession(queryClient)

      if (redirectTo) {
        navigate(redirectTo, { replace: true })
      }
    },
  })

  return {
    error: mutation.error,
    isPending: mutation.isPending,
    logout: mutation.mutate,
    logoutAsync: mutation.mutateAsync,
    reset: mutation.reset,
  }
}
