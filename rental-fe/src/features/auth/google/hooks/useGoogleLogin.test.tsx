import { http, HttpResponse } from "msw"
import { screen, waitFor } from "@testing-library/react"
import { useLocation } from "react-router-dom"
import { QueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"

import { getAccessToken, setAccessToken } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"
import { renderWithProviders } from "@/test/renderWithProviders"
import { server } from "@/test/server"

import { CURRENT_USER_QUERY_KEY } from "../../auth-query"
import { useGoogleLogin } from "./useGoogleLogin"

const userResponse = {
  _id: "google-user",
  name: "Google User",
  email: "google@example.com",
  authProvider: "GOOGLE",
  role: "USER",
  status: "ACTIVE",
  createdAt: "2026-07-21T00:00:00.000Z",
  updatedAt: "2026-07-21T00:00:00.000Z",
}

function GoogleLoginProbe({ redirectTo = "/profile" }: { redirectTo?: string }) {
  const login = useGoogleLogin(redirectTo)
  const location = useLocation()

  return (
    <div>
      <span>{`${location.pathname}${location.search}`}</span>
      <span>{login.error ? "error" : "ready"}</span>
      <button type="button" onClick={() => login.login("google-id-token")}>Continue</button>
    </div>
  )
}

describe("useGoogleLogin", () => {
  afterEach(() => setAccessToken(null))

  it("stores the access token, hydrates the user, and applies the safe redirect", async () => {
    server.use(
      http.post("/api/v1/users/login/google", async ({ request }) => {
        expect(await request.json()).toEqual({ credential: "google-id-token" })
        return HttpResponse.json({
          success: true,
          data: {
            user: userResponse,
            accessToken: "google-access-token",
            isNewUser: true,
          },
        })
      }),
    )

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
        mutations: { retry: false },
      },
    })
    const rendered = renderWithProviders(<GoogleLoginProbe />, {
      initialEntries: ["/login"],
      queryClient,
    })
    queryClient.setQueryData(queryKeys.savedListings.list({ limit: 20 }), {
      pages: [],
    })
    const cancel = vi.spyOn(queryClient, "cancelQueries")
    const { user } = rendered
    await user.click(screen.getByRole("button", { name: "Continue" }))

    expect(await screen.findByText("/profile")).toBeInTheDocument()
    expect(getAccessToken()).toBe("google-access-token")
    expect(queryClient.getQueryData(CURRENT_USER_QUERY_KEY)).toEqual(userResponse)
    expect(
      queryClient.getQueryData(queryKeys.savedListings.list({ limit: 20 })),
    ).toBeUndefined()
    expect(cancel).toHaveBeenCalledWith()
  })

  it("sends new users to profile setup even when a different redirect is requested", async () => {
    server.use(
      http.post("/api/v1/users/login/google", () =>
        HttpResponse.json({
          success: true,
          data: {
            user: userResponse,
            accessToken: "google-access-token",
            isNewUser: true,
          },
        }),
      ),
    )

    const { user } = renderWithProviders(
      <GoogleLoginProbe redirectTo="/listings/new?buildingId=building-1" />,
      { initialEntries: ["/login"] },
    )

    await user.click(screen.getByRole("button", { name: "Continue" }))

    expect(await screen.findByText("/profile")).toBeInTheDocument()
  })

  it("honors safe redirects for returning users", async () => {
    server.use(
      http.post("/api/v1/users/login/google", () =>
        HttpResponse.json({
          success: true,
          data: {
            user: userResponse,
            accessToken: "google-access-token",
            isNewUser: false,
          },
        }),
      ),
    )

    const { user } = renderWithProviders(
      <GoogleLoginProbe redirectTo="/listings/new?buildingId=building-1" />,
      { initialEntries: ["/login"] },
    )

    await user.click(screen.getByRole("button", { name: "Continue" }))

    expect(
      await screen.findByText("/listings/new?buildingId=building-1"),
    ).toBeInTheDocument()
  })

  it("preserves the existing session and cache when authentication fails", async () => {
    server.use(
      http.post("/api/v1/users/login/google", () =>
        HttpResponse.json(
          { success: false, code: "INVALID_GOOGLE_CREDENTIAL" },
          { status: 401 },
        ),
      ),
    )
    setAccessToken("existing-token")
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
        mutations: { retry: false },
      },
    })
    const existingUser = { ...userResponse, _id: "existing-user" }
    const savedKey = queryKeys.savedListings.list({ limit: 20 })
    const savedData = { pages: [{ data: { savedListings: [] } }] }
    queryClient.setQueryData(CURRENT_USER_QUERY_KEY, existingUser)
    queryClient.setQueryData(savedKey, savedData)
    const { user } = renderWithProviders(<GoogleLoginProbe />, {
      initialEntries: ["/login"],
      queryClient,
    })

    await user.click(screen.getByRole("button", { name: "Continue" }))
    await waitFor(() => expect(screen.getByText("error")).toBeInTheDocument())

    expect(screen.getByText("/login")).toBeInTheDocument()
    expect(getAccessToken()).toBe("existing-token")
    expect(queryClient.getQueryData(CURRENT_USER_QUERY_KEY)).toEqual(
      existingUser,
    )
    expect(queryClient.getQueryData(savedKey)).toEqual(savedData)
  })
})
