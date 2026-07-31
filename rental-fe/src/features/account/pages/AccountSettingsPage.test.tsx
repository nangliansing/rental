import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AuthUser } from "@/features/auth/types"

const authState = vi.hoisted(() => ({
  user: null as AuthUser | null,
  isAuthenticated: false,
  isLoading: false,
}))

const mutationMocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}))

const navigateBackMock = vi.hoisted(() => vi.fn())

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => authState,
}))

vi.mock("@/features/auth/hooks/useUpdateMyUser", () => ({
  useUpdateMyUser: () => ({
    mutateAsync: mutationMocks.mutateAsync,
  }),
}))

vi.mock("@/shared/hooks/useNavigateBack", () => ({
  useNavigateBack: () => navigateBackMock,
}))

vi.mock("@/shared/components/navigation/StandalonePageBackContext", () => ({
  useStandalonePageBack: vi.fn(),
}))

vi.mock("../components/AccountProfileForm", () => ({
  AccountProfileForm: ({
    defaultValues,
    onSubmit,
  }: {
    defaultValues?: { name?: string }
    onSubmit?: (values: { name?: string }) => Promise<void>
  }) => (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void onSubmit?.({ name: "Updated Name" })
      }}
    >
      <p>Form name: {defaultValues?.name}</p>
      <button type="submit">Save account form</button>
    </form>
  ),
}))

import { AccountSettingsPage } from "./AccountSettingsPage"

const activeUser: AuthUser = {
  _id: "user-1",
  name: "Jane Doe",
  email: "jane@example.com",
  profilePhoto: null,
  authProvider: "GOOGLE",
  role: "USER",
  status: "ACTIVE",
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-21T00:00:00.000Z",
}

describe("AccountSettingsPage", () => {
  beforeEach(() => {
    authState.user = activeUser
    authState.isAuthenticated = true
    authState.isLoading = false
    mutationMocks.mutateAsync.mockReset().mockResolvedValue(activeUser)
    navigateBackMock.mockReset()
  })

  it("shows a loading state while auth is resolving", () => {
    authState.isLoading = true

    render(<AccountSettingsPage />)

    expect(screen.getByText("Loading account...")).toBeInTheDocument()
  })

  it("shows login required when the user is signed out", () => {
    authState.user = null
    authState.isAuthenticated = false

    render(<AccountSettingsPage />)

    expect(
      screen.getByText("Log in to edit your account profile."),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Log in/i })).toHaveAttribute(
      "href",
      "/login?redirect=/account/edit",
    )
  })

  it("renders the account form with current user defaults", () => {
    render(<AccountSettingsPage />)

    expect(screen.getByRole("heading", { name: "Edit account" })).toBeInTheDocument()
    expect(screen.getByText("Form name: Jane Doe")).toBeInTheDocument()
  })

  it("updates the account and navigates back on success", async () => {
    const user = userEvent.setup()

    render(<AccountSettingsPage />)

    await user.click(screen.getByRole("button", { name: "Save account form" }))

    await waitFor(() =>
      expect(mutationMocks.mutateAsync).toHaveBeenCalledWith({
        name: "Updated Name",
      }),
    )
    expect(navigateBackMock).toHaveBeenCalledTimes(1)
  })
})
