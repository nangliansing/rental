import { Navigate, useSearchParams } from "react-router-dom"

import { getSafeAuthRedirect } from "@/features/auth/utils/getSafeAuthRedirect"

export function RegisterPage() {
  const [searchParams] = useSearchParams()
  const redirectTo = getSafeAuthRedirect(searchParams.get("redirect"))

  return (
    <Navigate
      replace
      to={`/login?redirect=${encodeURIComponent(redirectTo)}`}
    />
  )
}

