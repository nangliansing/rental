import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

import { useUpdateMyUser } from "../hooks/useUpdateMyUser"
import type { AuthUser } from "../types"

const apiMocks = vi.hoisted(() => ({
  update: vi.fn(),
}))

vi.mock("./updateMyUser", () => ({ updateMyUser: apiMocks.update }))

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
  name: "Rental User",
  email: "user@example.com",
  profilePhoto: null,
  authProvider: "GOOGLE",
  role: "USER",
  status: "ACTIVE",
  createdAt: "2026-07-21T00:00:00.000Z",
  updatedAt: "2026-07-21T00:00:00.000Z",
}

const updatedUser: AuthUser = {
  ...currentUser,
  name: "Updated User",
  updatedAt: "2026-07-22T00:00:00.000Z",
}

describe("auth user mutations", () => {
  let queryClient: QueryClient
  let wrapper: ({ children }: { children: ReactNode }) => ReactNode

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
        mutations: { retry: false },
      },
    })
    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    apiMocks.update.mockReset().mockResolvedValue(updatedUser)
    queryClient.setQueryData(queryKeys.auth.currentUser, currentUser)
  })

  it("optimistically updates the current user and reconciles success", async () => {
    let resolveUpdate!: (value: AuthUser) => void
    apiMocks.update.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve
        }),
    )
    const cancel = vi.spyOn(queryClient, "cancelQueries")
    const { result } = renderHook(() => useUpdateMyUser(), { wrapper })

    act(() => {
      result.current.mutate({ name: "Optimistic Name" })
    })

    await waitFor(() =>
      expect(
        queryClient.getQueryData<AuthUser>(queryKeys.auth.currentUser)?.name,
      ).toBe("Optimistic Name"),
    )
    expect(cancel).toHaveBeenCalledWith({
      queryKey: queryKeys.auth.currentUser,
    })

    await act(async () => resolveUpdate(updatedUser))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(queryKeys.auth.currentUser)).toEqual(
      updatedUser,
    )
  })

  it("optimistically updates profilePhoto and reconciles success", async () => {
    const photoUser = {
      ...updatedUser,
      profilePhoto: sampleProfilePhoto,
    }
    apiMocks.update.mockResolvedValue(photoUser)
    const { result } = renderHook(() => useUpdateMyUser(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ profilePhoto: sampleProfilePhoto })
    })

    expect(queryClient.getQueryData(queryKeys.auth.currentUser)).toEqual(
      photoUser,
    )
  })

  it("optimistically clears profilePhoto with null", async () => {
    queryClient.setQueryData(queryKeys.auth.currentUser, {
      ...currentUser,
      profilePhoto: sampleProfilePhoto,
    })
    apiMocks.update.mockResolvedValue({
      ...currentUser,
      profilePhoto: null,
      updatedAt: "2026-07-22T00:00:00.000Z",
    })
    const { result } = renderHook(() => useUpdateMyUser(), { wrapper })

    act(() => {
      result.current.mutate({ profilePhoto: null })
    })

    await waitFor(() =>
      expect(
        queryClient.getQueryData<AuthUser>(queryKeys.auth.currentUser)
          ?.profilePhoto,
      ).toBeNull(),
    )
  })

  it("reconciles admin user projections on success", async () => {
    const adminUserKey = queryKeys.admin.users.detail(currentUser._id)
    queryClient.setQueryData(adminUserKey, currentUser)
    const { result } = renderHook(() => useUpdateMyUser(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ name: "Updated User" })
    })

    expect(queryClient.getQueryData(adminUserKey)).toMatchObject({
      name: "Updated User",
    })
  })

  it("restores the previous current user when the update fails", async () => {
    apiMocks.update.mockRejectedValue(new Error("Network error"))
    const { result } = renderHook(() => useUpdateMyUser(), { wrapper })

    await expect(
      act(async () => result.current.mutateAsync({ name: "Optimistic Name" })),
    ).rejects.toThrow("Network error")

    expect(queryClient.getQueryData(queryKeys.auth.currentUser)).toEqual(
      currentUser,
    )
  })

  it("restores profilePhoto when the update fails", async () => {
    queryClient.setQueryData(queryKeys.auth.currentUser, {
      ...currentUser,
      profilePhoto: sampleProfilePhoto,
    })
    apiMocks.update.mockRejectedValue(new Error("Network error"))
    const { result } = renderHook(() => useUpdateMyUser(), { wrapper })

    await expect(
      act(async () =>
        result.current.mutateAsync({ profilePhoto: null }),
      ),
    ).rejects.toThrow("Network error")

    expect(
      queryClient.getQueryData<AuthUser>(queryKeys.auth.currentUser)?.profilePhoto,
    ).toEqual(sampleProfilePhoto)
  })

  it("serializes repeated current-user update requests", async () => {
    let resolveFirst!: (value: AuthUser) => void
    apiMocks.update
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockResolvedValueOnce(updatedUser)
    const { result } = renderHook(() => useUpdateMyUser(), { wrapper })

    act(() => {
      result.current.mutate({ name: "First Update" })
      result.current.mutate({ name: "Second Update" })
    })

    await waitFor(() => expect(apiMocks.update).toHaveBeenCalledTimes(1))
    await act(async () => resolveFirst(updatedUser))
    await waitFor(() => expect(apiMocks.update).toHaveBeenCalledTimes(2))
  })

  it("rejects updates when the current user is unavailable", async () => {
    queryClient.setQueryData(queryKeys.auth.currentUser, null)
    const { result } = renderHook(() => useUpdateMyUser(), { wrapper })

    await expect(
      act(async () => result.current.mutateAsync({ name: "Blocked" })),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "CURRENT_USER_UNAVAILABLE",
      }),
    )
    expect(apiMocks.update).not.toHaveBeenCalled()
  })

  it("rejects updates when the current user is not active", async () => {
    queryClient.setQueryData(queryKeys.auth.currentUser, {
      ...currentUser,
      status: "SUSPENDED",
    })
    const { result } = renderHook(() => useUpdateMyUser(), { wrapper })

    await expect(
      act(async () => result.current.mutateAsync({ name: "Blocked" })),
    ).rejects.toBeInstanceOf(ApiError)
    expect(apiMocks.update).not.toHaveBeenCalled()
  })

  it("rejects updates when the current user is inactive", async () => {
    queryClient.setQueryData(queryKeys.auth.currentUser, {
      ...currentUser,
      status: "INACTIVE",
    })
    const { result } = renderHook(() => useUpdateMyUser(), { wrapper })

    await expect(
      act(async () => result.current.mutateAsync({ name: "Blocked" })),
    ).rejects.toBeInstanceOf(ApiError)
    expect(apiMocks.update).not.toHaveBeenCalled()
  })

  it("does not invalidate the current-user query after success", async () => {
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    const { result } = renderHook(() => useUpdateMyUser(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ name: "Updated User" })
    })

    expect(invalidate).not.toHaveBeenCalled()
  })
})
