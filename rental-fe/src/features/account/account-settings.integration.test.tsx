import { http, HttpResponse } from "msw"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AuthProvider } from "@/features/auth/AuthProvider"
import { CURRENT_USER_QUERY_KEY } from "@/features/auth/auth-query"
import type { AuthUser } from "@/features/auth/types"
import { StandalonePageBackProvider } from "@/shared/components/navigation/StandalonePageBackContext"
import { setAccessToken } from "@/lib/api-client"
import { renderWithProviders } from "@/test/renderWithProviders"
import { server } from "@/test/server"

import { AccountSettingsPage } from "./pages/AccountSettingsPage"

const sampleProfilePhoto = {
  publicId: "users/test-photo",
  secureUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
  resourceType: "image",
  format: "jpg",
  width: 800,
  height: 600,
  bytes: 120000,
  position: 0,
  alt: "User profile photo",
  isCover: false,
}

const currentUser: AuthUser = {
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

const navigateBackMock = vi.fn()

vi.mock("@/features/uploads/components/AvatarUploader", () => ({
  AvatarUploader: ({
    onUploadStateChange,
  }: {
    onUploadStateChange?: (state: {
      isUploading: boolean
      hasFailedUpload: boolean
      media: typeof sampleProfilePhoto[]
    }) => void
  }) => (
    <button
      type="button"
      onClick={() =>
        onUploadStateChange?.({
          isUploading: false,
          hasFailedUpload: false,
          media: [sampleProfilePhoto],
        })
      }
    >
      Attach profile photo
    </button>
  ),
}))

vi.mock("@/shared/hooks/useNavigateBack", () => ({
  useNavigateBack: () => navigateBackMock,
}))

function installCurrentUserHandler(user: AuthUser = currentUser) {
  server.use(
    http.get("/api/v1/users/me", () =>
      HttpResponse.json({
        success: true,
        data: { user },
      }),
    ),
  )
}

function renderAccountSettingsPage() {
  installCurrentUserHandler()

  return renderWithProviders(
    <AuthProvider>
      <StandalonePageBackProvider>
        <AccountSettingsPage />
      </StandalonePageBackProvider>
    </AuthProvider>,
    { initialEntries: ["/account/edit"] },
  )
}

describe("account settings integration", () => {
  beforeEach(() => {
    setAccessToken("access-token")
    navigateBackMock.mockReset()
  })

  it("loads the signed-in user and updates through PATCH /users/me", async () => {
    let patchBody: Record<string, unknown> | null = null

    server.use(
      http.patch("/api/v1/users/me", async ({ request }) => {
        patchBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          success: true,
          data: {
            user: {
              ...currentUser,
              name: "Updated Name",
              profilePhoto: sampleProfilePhoto,
              updatedAt: "2026-07-22T00:00:00.000Z",
            },
          },
        })
      }),
    )

    const { user, queryClient } = renderAccountSettingsPage()

    expect(await screen.findByRole("textbox", { name: "Name" })).toHaveValue(
      "Jane Doe",
    )

    await user.clear(screen.getByRole("textbox", { name: "Name" }))
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Updated Name")
    await user.click(screen.getByRole("button", { name: "Attach profile photo" }))
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => expect(navigateBackMock).toHaveBeenCalledTimes(1))
    expect(patchBody).toEqual({
      name: "Updated Name",
      profilePhoto: sampleProfilePhoto,
    })
    expect(queryClient.getQueryData<AuthUser>(CURRENT_USER_QUERY_KEY)).toEqual({
      ...currentUser,
      name: "Updated Name",
      profilePhoto: sampleProfilePhoto,
      updatedAt: "2026-07-22T00:00:00.000Z",
    })
  })

  it("surfaces API validation errors without navigating away", async () => {
    server.use(
      http.patch("/api/v1/users/me", () =>
        HttpResponse.json(
          {
            success: false,
            code: "VALIDATION_ERROR",
            message: "No user changes provided",
          },
          { status: 422 },
        ),
      ),
    )

    const { user } = renderAccountSettingsPage()

    await screen.findByRole("textbox", { name: "Name" })
    await user.click(screen.getByRole("button", { name: "Attach profile photo" }))
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No user changes provided",
    )
    expect(navigateBackMock).not.toHaveBeenCalled()
  })

  it("optimistically updates the cache before the server responds", async () => {
    let resolvePatch!: () => void

    server.use(
      http.patch("/api/v1/users/me", async () => {
        await new Promise<void>((resolve) => {
          resolvePatch = resolve
        })
        return HttpResponse.json({
          success: true,
          data: {
            user: {
              ...currentUser,
              name: "Optimistic Name",
              updatedAt: "2026-07-22T00:00:00.000Z",
            },
          },
        })
      }),
    )

    const { user, queryClient } = renderAccountSettingsPage()

    await screen.findByRole("textbox", { name: "Name" })
    await user.clear(screen.getByRole("textbox", { name: "Name" }))
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Optimistic Name")
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() =>
      expect(queryClient.getQueryData<AuthUser>(CURRENT_USER_QUERY_KEY)?.name).toBe(
        "Optimistic Name",
      ),
    )

    resolvePatch!()
    await waitFor(() => expect(navigateBackMock).toHaveBeenCalledTimes(1))
  })

  it("rolls back optimistic changes when the update fails", async () => {
    server.use(
      http.patch("/api/v1/users/me", () =>
        HttpResponse.json(
          {
            success: false,
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
          },
          { status: 429 },
        ),
      ),
    )

    const { user, queryClient } = renderAccountSettingsPage()

    await screen.findByRole("textbox", { name: "Name" })
    await user.clear(screen.getByRole("textbox", { name: "Name" }))
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Failed Name")
    await user.click(screen.getByRole("button", { name: "Save changes" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many attempts. Please wait and try again.",
    )
    expect(queryClient.getQueryData<AuthUser>(CURRENT_USER_QUERY_KEY)).toEqual(
      currentUser,
    )
    expect(navigateBackMock).not.toHaveBeenCalled()
  })
})
