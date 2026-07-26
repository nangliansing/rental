import { useNavigate } from "react-router-dom"

import { LoginRequired } from "@/shared/components/auth/LoginRequired"
import { useStandalonePageBack } from "@/shared/components/navigation/StandalonePageBackContext"
import { useNavigateBack } from "@/shared/hooks/useNavigateBack"

import { useUpdateMyAgentProfile } from "../api"
import { AgentProfileForm } from "../components/AgentProfileForm"
import {
  ProfilePageError,
  ProfilePageLoading,
  ProfileSetupRequired,
} from "../components/ProfilePageStates"
import { useMyProfileGate } from "../hooks/useMyProfileGate"
import { PROFILE_PATH } from "../utils/profileLayoutStyles"

export function ProfileEditPage() {
  const navigate = useNavigate()
  const navigateBack = useNavigateBack(PROFILE_PATH)
  useStandalonePageBack(navigateBack)
  const updateProfileMutation = useUpdateMyAgentProfile()
  const gate = useMyProfileGate()

  return (
    <main className="min-h-screen bg-white px-4 pb-10 pt-6 text-slate-950">
      <div className="mx-auto max-w-2xl">
        {gate.isProfileLoading && (
          <ProfilePageLoading message="Loading profile..." />
        )}

        {gate.showLogin && (
          <LoginRequired
            description="Log in to edit your contact profile."
            loginHref="/login?redirect=/profile/edit"
            secondaryHref="/profile"
            secondaryLabel="Back to profile"
          />
        )}

        {!gate.isAuthLoading && gate.isAuthenticated && gate.isMissing && (
          <ProfileSetupRequired />
        )}

        {!gate.isAuthLoading && gate.isAuthenticated && gate.profile && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold">Edit contact profile</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Update how renters recognize and contact you.
              </p>
            </div>

            <AgentProfileForm
              mode="edit"
              defaultValues={gate.profile}
              onSubmit={async (values) => {
                await updateProfileMutation.mutateAsync(values)
                navigate(PROFILE_PATH)
              }}
            />
          </div>
        )}

        {gate.showProfileError && (
          <ProfilePageError
            message={gate.errorMessage}
            onRetry={() => void gate.profileQuery.refetch()}
          />
        )}
      </div>
    </main>
  )
}
