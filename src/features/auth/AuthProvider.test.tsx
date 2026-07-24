import { http, HttpResponse } from "msw"
import { screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { apiClient, clearAccessToken, setAccessToken } from "@/lib/api-client"
import { createTestQueryClient, renderWithProviders } from "@/test/renderWithProviders"
import { server } from "@/test/server"

import { AuthProvider } from "./AuthProvider"
import { useAuth } from "./hooks/useAuth"

const activeUser = {
  _id: "user-1",
  name: "Rental User",
  email: "user@example.com",
  authProvider: "GOOGLE",
  role: "USER",
  status: "ACTIVE",
  createdAt: "2026-07-21T00:00:00.000Z",
  updatedAt: "2026-07-21T00:00:00.000Z",
}

function AuthProbe() {
  const auth = useAuth()

  return (
    <div>
      <span>{auth.isLoading ? "loading" : auth.isAuthenticated ? auth.user?.email : "anonymous"}</span>
      <button type="button" onClick={() => void apiClient.get("/private-check").catch(() => undefined)}>
        Check private API
      </button>
    </div>
  )
}

describe("AuthProvider", () => {
  beforeEach(() => clearAccessToken())

  it("restores the session through the refresh cookie and exposes one authenticated state", async () => {
    let meRequests = 0
    server.use(
      http.get("/api/v1/users/me", ({ request }) => {
        meRequests += 1

        if (request.headers.get("authorization") !== "Bearer refreshed-token") {
          return HttpResponse.json({ success: false, code: "ACCESS_TOKEN_REQUIRED" }, { status: 401 })
        }

        return HttpResponse.json({ success: true, data: { user: activeUser } })
      }),
      http.post("/api/v1/users/token/refresh", () =>
        HttpResponse.json({ success: true, data: { accessToken: "refreshed-token" } }),
      ),
    )

    renderWithProviders(
      <AuthProvider><AuthProbe /></AuthProvider>,
      { queryClient: createTestQueryClient() },
    )

    expect(screen.getByText("loading")).toBeInTheDocument()
    expect(await screen.findByText(activeUser.email)).toBeInTheDocument()
    expect(meRequests).toBe(2)
  })

  it("clears stale authenticated UI when token refresh fails", async () => {
    setAccessToken("expired-token")
    server.use(
      http.get("/api/v1/users/me", () =>
        HttpResponse.json({ success: true, data: { user: activeUser } }),
      ),
      http.get("/api/v1/private-check", () =>
        HttpResponse.json({ success: false, code: "INVALID_ACCESS_TOKEN" }, { status: 401 }),
      ),
      http.post("/api/v1/users/token/refresh", () =>
        HttpResponse.json({ success: false, code: "INVALID_REFRESH_TOKEN" }, { status: 401 }),
      ),
    )

    const { user } = renderWithProviders(<AuthProvider><AuthProbe /></AuthProvider>)
    expect(await screen.findByText(activeUser.email)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Check private API" }))

    await waitFor(() => expect(screen.getByText("anonymous")).toBeInTheDocument())
  })

  it("rejects malformed current-user success responses", async () => {
    setAccessToken("token")
    server.use(
      http.get("/api/v1/users/me", () =>
        HttpResponse.json({ success: true, data: { user: { email: "broken@example.com" } } }),
      ),
    )

    renderWithProviders(<AuthProvider><AuthProbe /></AuthProvider>)

    expect(await screen.findByText("anonymous")).toBeInTheDocument()
  })
})
