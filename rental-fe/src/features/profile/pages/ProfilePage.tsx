import { UserRound } from "lucide-react"
import { useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { GoogleLoginPanel } from "@/features/auth/google"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { useLogout } from "@/features/auth/hooks/useLogout"

import {
  MY_AGENT_PROFILE_QUERY_KEY,
  type AgentProfile,
  useCreateAgentProfile,
} from "../api"
import {
  AgentProfileForm,
  type AgentProfileFormValues,
} from "../components/AgentProfileForm"
import { MyProfileContent } from "../components/MyProfileContent"
import {
  ProfilePageError,
  ProfilePageLoading,
} from "../components/ProfilePageStates"
import { useMyProfileGate } from "../hooks/useMyProfileGate"

export function ProfilePage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const logoutMutation = useLogout({ redirectTo: null })
  const createProfileMutation = useCreateAgentProfile()
  const gate = useMyProfileGate()
  const updateCachedProfileRef = useRef((profile: AgentProfile) => {
    queryClient.setQueryData(MY_AGENT_PROFILE_QUERY_KEY, profile)
  })

  const logoutError = logoutMutation.error
    ? logoutMutation.error instanceof Error
      ? logoutMutation.error.message
      : "Could not log out. Please try again."
    : ""

  return (
    <main className="min-h-screen bg-white px-4 pb-24 pt-6 text-slate-950">
      {gate.isProfileLoading && <ProfilePageLoading />}

      {gate.showLogin && (
        <div className="mx-auto flex min-h-[70vh] max-w-md items-center">
          <GoogleLoginPanel
            title="Continue to your profile"
            description="Sign in to manage your listings, saved places, and contact profile."
            redirectTo="/profile"
            icon={<UserRound className="h-6 w-6 text-slate-700" />}
          />
        </div>
      )}

      {!gate.isAuthLoading &&
        gate.isAuthenticated &&
        gate.isMissing && (
          <ProfileSetup onCreate={createProfileMutation.mutateAsync} />
        )}

      {!gate.isAuthLoading && gate.isAuthenticated && gate.profile && (
        <MyProfileContent
          user={user}
          profile={gate.profile}
          onProfileChange={updateCachedProfileRef.current}
          logout={{
            isLoggingOut: logoutMutation.isPending,
            error: logoutError,
            logout: logoutMutation.logout,
            reset: logoutMutation.reset,
          }}
        />
      )}

      {gate.showProfileError && (
        <ProfilePageError
          message={gate.errorMessage}
          onRetry={() => void gate.profileQuery.refetch()}
        />
      )}
    </main>
  )
}

function ProfileSetup({
  onCreate,
}: {
  onCreate: (values: AgentProfileFormValues) => Promise<AgentProfile>
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Contact profile</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Set how renters can recognize and contact you. After this, you can list
          your first room from the map.
        </p>
      </div>

      <AgentProfileForm
        onSubmit={async (values) => {
          await onCreate(values)
        }}
      />
    </div>
  )
}
