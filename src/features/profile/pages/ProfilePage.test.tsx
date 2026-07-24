import { screen, waitFor } from "@testing-library/react"
import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"
import { renderWithProviders } from "@/test/renderWithProviders"

import { ProfilePage } from "./ProfilePage"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  logout: vi.fn(),
  profileQuery: vi.fn(),
  createProfile: vi.fn(),
  refetch: vi.fn(),
  resetLogout: vi.fn(),
}))

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => mocks.auth(),
}))

vi.mock("@/features/auth/hooks/useLogout", () => ({
  useLogout: () => mocks.logout(),
}))

vi.mock("@/features/auth/google", () => ({
  GoogleLoginPanel: ({ title }: { title: string }) => <div>{title}</div>,
}))

vi.mock("../api", () => ({
  MY_AGENT_PROFILE_QUERY_KEY: ["agent-profiles", "me"],
  useMyAgentProfile: () => mocks.profileQuery(),
  useCreateAgentProfile: () => ({ mutateAsync: mocks.createProfile }),
}))

vi.mock("../components/AgentProfileForm", () => ({
  AgentProfileForm: ({ onSubmit }: { onSubmit: (values: unknown) => Promise<void> }) => (
    <button type="button" onClick={() => void onSubmit({ displayName: "New profile" })}>
      Create test profile
    </button>
  ),
}))

vi.mock("../components/MyProfileContent", () => ({
  MyProfileContent: ({
    profile,
    onProfileChange,
    logout,
  }: {
    profile: { displayName: string }
    onProfileChange: (profile: unknown) => void
    logout: { logout: () => Promise<void> }
  }) => (
    <div>
      <span>{profile.displayName}</span>
      <button type="button" onClick={() => onProfileChange({ ...profile, displayName: "Updated profile" })}>
        Update cached profile
      </button>
      <button type="button" onClick={() => void logout.logout()}>Profile logout</button>
    </div>
  ),
}))

const profile = {
  _id: "profile-1",
  userId: "user-1",
  displayName: "Existing profile",
}

function setDefaultState() {
  mocks.auth.mockReturnValue({
    user: { _id: "user-1", email: "user@example.com" },
    isAuthenticated: true,
    isLoading: false,
  })
  mocks.logout.mockReturnValue({
    error: null,
    isPending: false,
    logout: vi.fn(),
    logoutAsync: vi.fn().mockResolvedValue(undefined),
    reset: mocks.resetLogout,
  })
  mocks.profileQuery.mockReturnValue({
    data: profile,
    error: null,
    isPending: false,
    isError: false,
    isMissing: false,
    refetch: mocks.refetch,
  })
  mocks.createProfile.mockResolvedValue(profile)
}

describe("ProfilePage", () => {
  it("shows the Google panel directly for signed-out users", () => {
    setDefaultState()
    mocks.auth.mockReturnValue({ user: null, isAuthenticated: false, isLoading: false })

    renderWithProviders(<ProfilePage />)

    expect(screen.getByText("Continue to your profile")).toBeInTheDocument()
    expect(mocks.profileQuery).toHaveBeenCalled()
  })

  it("renders loading and missing-profile setup states", async () => {
    setDefaultState()
    mocks.profileQuery.mockReturnValue({
      data: undefined,
      error: new ApiError("Missing", 404, "AGENT_PROFILE_NOT_FOUND"),
      isPending: false,
      isError: true,
      isMissing: true,
      refetch: mocks.refetch,
    })

    const { user } = renderWithProviders(<ProfilePage />)
    expect(screen.getByText("Contact profile")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Create test profile" }))
    expect(mocks.createProfile).toHaveBeenCalledWith({ displayName: "New profile" })
  })

  it("uses cached profile data and keeps logout in the shared session flow", async () => {
    setDefaultState()
    const logout = vi.fn()
    mocks.logout.mockReturnValue({
      error: null,
      isPending: false,
      logout,
      logoutAsync: vi.fn().mockResolvedValue(undefined),
      reset: mocks.resetLogout,
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
        mutations: { retry: false },
      },
    })
    const { user } = renderWithProviders(<ProfilePage />, { queryClient })
    await user.click(screen.getByRole("button", { name: "Update cached profile" }))
    expect(queryClient.getQueryData(["agent-profiles", "me"])).toMatchObject({
      displayName: "Updated profile",
    })

    await user.click(screen.getByRole("button", { name: "Profile logout" }))
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1))
  })

  it("retries profile errors without reloading the application", async () => {
    setDefaultState()
    mocks.profileQuery.mockReturnValue({
      data: undefined,
      error: new Error("Profile service unavailable"),
      isPending: false,
      isError: true,
      isMissing: false,
      refetch: mocks.refetch,
    })

    const { user } = renderWithProviders(<ProfilePage />)
    expect(screen.getByText("Profile service unavailable")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Try again" }))
    expect(mocks.refetch).toHaveBeenCalledTimes(1)
  })
})
