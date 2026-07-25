import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

const mocks = vi.hoisted(() => ({ createAdminSuspension: vi.fn() }))

vi.mock("./createAdminSuspension", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./createAdminSuspension")>()
  return { ...actual, createAdminSuspension: mocks.createAdminSuspension }
})

import { useCreateAdminSuspension } from "./useCreateAdminSuspension"

const input = {
  userId: "user-1",
  reason: "Policy violation",
  expiresAt: "2026-08-01T00:00:00.000Z",
}

const activeUser = {
  _id: "user-1",
  name: "Lister",
  email: "lister@example.com",
  role: "USER",
  status: "ACTIVE",
}

const result = {
  user: {
    ...activeUser,
    authProvider: "GOOGLE",
    status: "SUSPENDED",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-07-22T00:00:00.000Z",
  },
  suspension: {
    _id: "suspension-1",
    userId: "user-1",
    status: "ACTIVE",
    reason: "Policy violation",
    note: null,
    startsAt: "2026-07-22T00:00:00.000Z",
    expiresAt: input.expiresAt,
    createdBy: "admin-1",
    liftedBy: null,
    liftedAt: null,
    liftReason: null,
    createdAt: "2026-07-22T00:00:00.000Z",
    updatedAt: "2026-07-22T00:00:00.000Z",
  },
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const pendingKey = queryKeys.admin.pendingPosts.list("PENDING")
  const buildingDetailKey = queryKeys.admin.buildingEditRequests.detail("edit-1")
  const reportKey = queryKeys.admin.reports.detail("report-1")
  const userKey = queryKeys.admin.users.detail("user-1")

  queryClient.setQueryData(pendingKey, {
    pages: [{ data: [{ _id: "post-1", submittedBy: activeUser }] }],
  })
  queryClient.setQueryData(buildingDetailKey, {
    _id: "edit-1",
    requestedBy: activeUser,
  })
  queryClient.setQueryData(reportKey, {
    _id: "report-1",
    listingOwner: activeUser,
  })
  queryClient.setQueryData(userKey, {
    ...activeUser,
    authProvider: "GOOGLE",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    agentProfile: { _id: "profile-1" },
  })

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  return {
    ...renderHook(() => useCreateAdminSuspension(), { wrapper: Wrapper }),
    buildingDetailKey,
    pendingKey,
    queryClient,
    reportKey,
    userKey,
  }
}

describe("useCreateAdminSuspension", () => {
  beforeEach(() => {
    mocks.createAdminSuspension.mockReset()
  })

  it("optimistically patches every cached user projection", async () => {
    let resolve!: (value: typeof result) => void
    mocks.createAdminSuspension.mockReturnValue(
      new Promise((done) => {
        resolve = done
      }),
    )
    const { result: hook, queryClient, pendingKey, buildingDetailKey, reportKey } =
      setup()

    act(() => {
      void hook.current.mutateAsync(input).catch(() => undefined)
    })
    await waitFor(() =>
      expect(queryClient.getQueryData(pendingKey)).toMatchObject({
        pages: [{ data: [{ submittedBy: { status: "SUSPENDED" } }] }],
      }),
    )
    expect(queryClient.getQueryData(buildingDetailKey)).toMatchObject({
      requestedBy: { status: "SUSPENDED" },
    })
    expect(queryClient.getQueryData(reportKey)).toMatchObject({
      listingOwner: { status: "SUSPENDED" },
    })

    await act(async () => resolve(result))
    await waitFor(() => expect(hook.current.isSuccess).toBe(true))
  })

  it("restores exact projections on error", async () => {
    let reject!: (error: Error) => void
    mocks.createAdminSuspension.mockImplementation(
      () => new Promise((_resolve, rejectPromise) => {
        reject = rejectPromise
      }),
    )
    const { result: hook, queryClient, pendingKey, userKey } = setup()

    act(() => {
      void hook.current.mutateAsync(input).catch(() => undefined)
    })
    await waitFor(() =>
      expect(queryClient.getQueryData(pendingKey)).toMatchObject({
        pages: [{ data: [{ submittedBy: { status: "SUSPENDED" } }] }],
      }),
    )
    reject(new Error("Network error"))
    await waitFor(() => expect(hook.current.isError).toBe(true))

    expect(queryClient.getQueryData(pendingKey)).toMatchObject({
      pages: [{ data: [{ submittedBy: { status: "ACTIVE" } }] }],
    })
    expect(queryClient.getQueryData(userKey)).toMatchObject({
      status: "ACTIVE",
      agentProfile: { _id: "profile-1" },
    })
  })

  it("reconciles the server user and invalidates only suspension records", async () => {
    mocks.createAdminSuspension.mockResolvedValue(result)
    const { result: hook, queryClient, userKey } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => hook.current.mutate(input))
    await waitFor(() => expect(hook.current.isSuccess).toBe(true))

    expect(queryClient.getQueryData(userKey)).toMatchObject({
      status: "SUSPENDED",
      updatedAt: result.user.updatedAt,
      agentProfile: { _id: "profile-1" },
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.admin.suspensions.lists,
      refetchType: "active",
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.admin.suspensions.detail("suspension-1"),
      refetchType: "active",
    })
  })

  it("serializes repeated suspension writes", async () => {
    let resolveFirst!: (value: typeof result) => void
    mocks.createAdminSuspension
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve
        }),
      )
      .mockResolvedValueOnce(result)
    const { result: hook } = setup()

    act(() => {
      hook.current.mutate(input)
      hook.current.mutate({ ...input, userId: "user-2" })
    })
    await waitFor(() =>
      expect(mocks.createAdminSuspension).toHaveBeenCalledTimes(1),
    )
    await act(async () => resolveFirst(result))
    await waitFor(() =>
      expect(mocks.createAdminSuspension).toHaveBeenCalledTimes(2),
    )
    await waitFor(() => expect(hook.current.isSuccess).toBe(true))
  })
})
