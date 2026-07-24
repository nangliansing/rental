import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

const mocks = vi.hoisted(() => ({ removeAdminRole: vi.fn() }))

vi.mock("./removeAdminRole", () => ({
  removeAdminRole: mocks.removeAdminRole,
}))

import { useRemoveAdminRole } from "./useRemoveAdminRole"

const input = { userId: "admin-1" }
const admin = {
  _id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  authProvider: "GOOGLE",
  role: "ADMIN",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}
const updatedUser = {
  ...admin,
  role: "USER",
  updatedAt: "2026-07-22T00:00:00.000Z",
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const platformKey = queryKeys.admin.platformAdmins.list
  const userKey = queryKeys.admin.users.detail("admin-1")
  const reviewReportKey = queryKeys.admin.reviewReports.detail("review-report-1")
  const suspensionKey = queryKeys.admin.suspensions.detail("suspension-1")
  queryClient.setQueryData(platformKey, {
    pageParams: [1],
    pages: [{
      data: [admin, { ...admin, _id: "admin-2", email: "two@example.com" }],
      pagination: { page: 1, limit: 20, total: 2 },
    }],
  })
  queryClient.setQueryData(userKey, { ...admin, agentProfile: { _id: "profile-1" } })
  queryClient.setQueryData(reviewReportKey, {
    _id: "review-report-1",
    reviewedBy: admin,
  })
  queryClient.setQueryData(suspensionKey, {
    _id: "suspension-1",
    status: "LIFTED",
    liftedBy: admin,
  })

  function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  return {
    ...renderHook(() => useRemoveAdminRole(), { wrapper: Wrapper }),
    platformKey,
    queryClient,
    reviewReportKey,
    suspensionKey,
    userKey,
  }
}

describe("useRemoveAdminRole", () => {
  beforeEach(() => {
    mocks.removeAdminRole.mockReset()
  })

  it("optimistically removes the admin and patches every role projection", async () => {
    let resolve!: (value: typeof updatedUser) => void
    mocks.removeAdminRole.mockImplementation(
      () => new Promise((done) => { resolve = done }),
    )
    const { result, queryClient, platformKey, userKey, reviewReportKey, suspensionKey } = setup()

    act(() => result.current.mutate(input))
    await waitFor(() =>
      expect(queryClient.getQueryData(platformKey)).toMatchObject({
        pages: [{ data: [{ _id: "admin-2" }], pagination: { total: 1 } }],
      }),
    )
    expect(queryClient.getQueryData(userKey)).toMatchObject({ role: "USER" })
    expect(queryClient.getQueryData(reviewReportKey)).toMatchObject({
      reviewedBy: { role: "USER" },
    })
    expect(queryClient.getQueryData(suspensionKey)).toMatchObject({
      liftedBy: { role: "USER" },
    })

    await act(async () => resolve(updatedUser))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("restores the exact platform list and user projections on error", async () => {
    mocks.removeAdminRole.mockRejectedValue(new Error("Network error"))
    const { result, queryClient, platformKey, userKey, reviewReportKey } = setup()

    act(() => result.current.mutate(input))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(queryClient.getQueryData(platformKey)).toMatchObject({
      pages: [{ data: [{ _id: "admin-1" }, { _id: "admin-2" }], pagination: { total: 2 } }],
    })
    expect(queryClient.getQueryData(userKey)).toMatchObject({ role: "ADMIN" })
    expect(queryClient.getQueryData(reviewReportKey)).toMatchObject({
      reviewedBy: { role: "ADMIN" },
    })
  })

  it("reconciles server data and invalidates only the platform-admin list", async () => {
    mocks.removeAdminRole.mockResolvedValue(updatedUser)
    const { result, queryClient, platformKey, userKey } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate(input))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(queryClient.getQueryData(userKey)).toMatchObject({
      role: "USER",
      updatedAt: updatedUser.updatedAt,
      agentProfile: { _id: "profile-1" },
    })
    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: platformKey,
      refetchType: "active",
    })
  })

  it("serializes repeated permission-changing writes", async () => {
    let resolveFirst!: (value: typeof updatedUser) => void
    mocks.removeAdminRole
      .mockImplementationOnce(
        () => new Promise((done) => { resolveFirst = done }),
      )
      .mockResolvedValueOnce({ ...updatedUser, _id: "admin-2" })
    const { result } = setup()

    act(() => {
      result.current.mutate(input)
      result.current.mutate({ userId: "admin-2" })
    })
    await waitFor(() => expect(mocks.removeAdminRole).toHaveBeenCalledTimes(1))
    await act(async () => resolveFirst(updatedUser))
    await waitFor(() => expect(mocks.removeAdminRole).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})
