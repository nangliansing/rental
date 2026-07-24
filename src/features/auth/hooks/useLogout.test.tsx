import { useState } from "react"
import { http, HttpResponse } from "msw"
import { screen, waitFor } from "@testing-library/react"
import { useLocation } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

import { getAccessToken, setAccessToken } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"
import { renderWithProviders } from "@/test/renderWithProviders"
import { server } from "@/test/server"

import { CURRENT_USER_QUERY_KEY } from "../auth-query"
import { useLogout } from "./useLogout"

function LogoutProbe({ redirectTo }: { redirectTo?: string | null }) {
  const logout = useLogout({ redirectTo })
  const location = useLocation()
  const [completed, setCompleted] = useState(false)

  return (
    <div>
      <span>{location.pathname}</span>
      <span>{completed ? "complete" : "active"}</span>
      <button
        type="button"
        onClick={() =>
          void logout.logoutAsync().then(
            () => setCompleted(true),
            () => setCompleted(true),
          )
        }
      >
        Log out
      </button>
    </div>
  )
}

describe("useLogout", () => {
  afterEach(() => setAccessToken(null))

  it("clears local session state and redirects by default", async () => {
    server.use(http.post("/api/v1/users/logout", () => HttpResponse.json({ success: true, message: "Logged out" })))
    setAccessToken("access-token")
    const { queryClient, user } = renderWithProviders(<LogoutProbe />, { initialEntries: ["/profile"] })
    queryClient.setQueryData(CURRENT_USER_QUERY_KEY, { _id: "user-1" })

    await user.click(screen.getByRole("button", { name: "Log out" }))

    expect(await screen.findByText("/login")).toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
    expect(queryClient.getQueryData(CURRENT_USER_QUERY_KEY) ?? null).toBeNull()
  })

  it("supports local logout flows without adding a navigation step", async () => {
    server.use(http.post("/api/v1/users/logout", () => HttpResponse.json({ success: true, message: "Logged out" })))
    setAccessToken("access-token")
    const { user } = renderWithProviders(<LogoutProbe redirectTo={null} />, { initialEntries: ["/profile"] })

    await user.click(screen.getByRole("button", { name: "Log out" }))

    await waitFor(() => expect(screen.getByText("complete")).toBeInTheDocument())
    expect(screen.getByText("/profile")).toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
  })

  it("clears local session state even when server revocation fails", async () => {
    server.use(
      http.post("/api/v1/users/logout", () =>
        HttpResponse.json(
          { success: false, message: "Could not revoke session" },
          { status: 503 },
        ),
      ),
    )
    setAccessToken("access-token")
    const { queryClient, user } = renderWithProviders(<LogoutProbe />, {
      initialEntries: ["/profile"],
    })
    queryClient.setQueryData(CURRENT_USER_QUERY_KEY, { _id: "user-1" })
    queryClient.setQueryData(queryKeys.savedListings.list({ limit: 20 }), {
      pages: [],
    })

    await user.click(screen.getByRole("button", { name: "Log out" }))

    expect(await screen.findByText("/login")).toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
    expect(queryClient.getQueryData(CURRENT_USER_QUERY_KEY) ?? null).toBeNull()
    expect(
      queryClient.getQueryData(queryKeys.savedListings.list({ limit: 20 })),
    ).toBeUndefined()
  })

  it("cancels active queries before revoking the session", async () => {
    server.use(
      http.post("/api/v1/users/logout", () =>
        HttpResponse.json({ success: true, message: "Logged out" }),
      ),
    )
    const { queryClient, user } = renderWithProviders(
      <LogoutProbe redirectTo={null} />,
    )
    const cancel = vi.spyOn(queryClient, "cancelQueries")

    await user.click(screen.getByRole("button", { name: "Log out" }))
    await waitFor(() => expect(screen.getByText("complete")).toBeInTheDocument())

    expect(cancel).toHaveBeenCalledWith()
  })
})
