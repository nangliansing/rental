import { Navigate, useSearchParams } from "react-router-dom"
import { KeyRound } from "lucide-react"

import { AuthSignInSection } from "@/features/auth/components/AuthSignInSection"
import { GoogleLoginPanel } from "@/features/auth/google"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { getSafeAuthRedirect } from "@/features/auth/utils/getSafeAuthRedirect"

export function LoginPage() {
  const [searchParams] = useSearchParams()
  const { isAuthenticated, isLoading } = useAuth()
  const redirectTo = getSafeAuthRedirect(searchParams.get("redirect"))

  if (!isLoading && isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-slate-950">
      <AuthSignInSection className="min-h-[calc(100vh-3.5rem)]">
        <GoogleLoginPanel
          title="Continue to Rental"
          description="Sign in to save listings, manage your profile, and list rooms."
          redirectTo={redirectTo}
          icon={<KeyRound className="h-6 w-6 text-slate-700" />}
        />
      </AuthSignInSection>
    </main>
  )
}
