import { useAuth } from "@/features/auth/hooks/useAuth"
import { useUpdateMyUser } from "@/features/auth/hooks/useUpdateMyUser"
import { LoginRequired } from "@/shared/components/auth/LoginRequired"
import { useStandalonePageBack } from "@/shared/components/navigation/StandalonePageBackContext"
import { useNavigateBack } from "@/shared/hooks/useNavigateBack"

import { AccountProfileForm } from "../components/AccountProfileForm"

const ACCOUNT_SETTINGS_PATH = "/account/edit"

export function AccountSettingsPage() {
  const navigateBack = useNavigateBack("/")
  useStandalonePageBack(navigateBack)
  const { user, isAuthenticated, isLoading } = useAuth()
  const updateUserMutation = useUpdateMyUser()

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white px-4 pb-10 pt-6 text-slate-950">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-slate-500">Loading account...</p>
        </div>
      </main>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <main className="min-h-screen bg-white px-4 pb-10 pt-6 text-slate-950">
        <div className="mx-auto max-w-2xl">
          <LoginRequired
            description="Log in to edit your account profile."
            loginHref={`/login?redirect=${ACCOUNT_SETTINGS_PATH}`}
          />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white px-4 pb-10 pt-6 text-slate-950">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Edit account</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Update the name and photo shown in your account menu.
          </p>
        </div>

        <AccountProfileForm
          defaultValues={{
            name: user.name,
            profilePhoto: user.profilePhoto,
          }}
          onSubmit={async (values) => {
            await updateUserMutation.mutateAsync(values)
            navigateBack()
          }}
        />
      </div>
    </main>
  )
}
