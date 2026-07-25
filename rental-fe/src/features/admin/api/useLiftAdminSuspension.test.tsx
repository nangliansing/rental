import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

const mocks = vi.hoisted(() => ({ liftAdminSuspension: vi.fn() }))

vi.mock("./liftAdminSuspension", () => ({
  liftAdminSuspension: mocks.liftAdminSuspension,
}))

import { useLiftAdminSuspension } from "./useLiftAdminSuspension"

const input = {
  suspensionId: "suspension-1",
  userId: "user-1",
  liftReason: "Appeal accepted",
}
const user = {
  _id: "user-1",
  name: "Lister",
  email: "lister@example.com",
  authProvider: "GOOGLE",
  role: "USER",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-07-22T00:00:00.000Z",
}
const activeSuspension = {
  _id: "suspension-1",
  userId: "user-1",
  status: "ACTIVE",
  reason: "Policy violation",
  note: null,
  startsAt: "2026-07-01T00:00:00.000Z",
  expiresAt: "2026-08-01T00:00:00.000Z",
  liftedAt: null,
  liftReason: null,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  user: { ...user, status: "SUSPENDED" },
  createdBy: null,
  liftedBy: null,
}
const liftedSuspension = {
  ...activeSuspension,
  status: "LIFTED",
  liftedAt: "2026-07-22T00:00:00.000Z",
  liftReason: input.liftReason,
  user,
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const activeKey = queryKeys.admin.suspensions.list("ACTIVE")
  const allKey = queryKeys.admin.suspensions.list("all")
  const detailKey = queryKeys.admin.suspensions.detail("suspension-1")
  const pendingKey = queryKeys.admin.pendingPosts.list("PENDING")
  const page = {
    pageParams: [1],
    pages: [{ data: [activeSuspension], pagination: { page: 1, limit: 20, total: 1 } }],
  }
  queryClient.setQueryData(activeKey, page)
  queryClient.setQueryData(allKey, page)
  queryClient.setQueryData(detailKey, activeSuspension)
  queryClient.setQueryData(pendingKey, {
    pages: [{ data: [{ _id: "post-1", submittedBy: activeSuspension.user }] }],
  })

  function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return {
    ...renderHook(() => useLiftAdminSuspension(), { wrapper: Wrapper }),
    activeKey,
    allKey,
    detailKey,
    pendingKey,
    queryClient,
  }
}

describe("useLiftAdminSuspension", () => {
  beforeEach(() => {
    mocks.liftAdminSuspension.mockReset()
  })

  it("optimistically transitions the suspension and every user projection", async () => {
    let resolve!: (value: typeof serverResult) => void
    const serverResult = { suspension: liftedSuspension, user }
    mocks.liftAdminSuspension.mockImplementation(
      () => new Promise((done) => { resolve = done }),
    )
    const { result, queryClient, activeKey, allKey, detailKey, pendingKey } = setup()

    act(() => result.current.mutate(input))
    await waitFor(() =>
      expect(queryClient.getQueryData<{ pages: Array<{ data: unknown[] }> }>(activeKey)?.pages[0].data).toEqual([]),
    )
    expect(queryClient.getQueryData(allKey)).toMatchObject({
      pages: [{ data: [{ status: "LIFTED", liftReason: input.liftReason }] }],
    })
    expect(queryClient.getQueryData(detailKey)).toMatchObject({ status: "LIFTED" })
    expect(queryClient.getQueryData(pendingKey)).toMatchObject({
      pages: [{ data: [{ submittedBy: { status: "ACTIVE" } }] }],
    })

    await act(async () => resolve(serverResult))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("restores both suspension and user projections on error", async () => {
    mocks.liftAdminSuspension.mockRejectedValue(new Error("Network error"))
    const { result, queryClient, activeKey, detailKey, pendingKey } = setup()

    act(() => result.current.mutate(input))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(queryClient.getQueryData(activeKey)).toMatchObject({
      pages: [{ data: [{ status: "ACTIVE" }] }],
    })
    expect(queryClient.getQueryData(detailKey)).toMatchObject({ status: "ACTIVE" })
    expect(queryClient.getQueryData(pendingKey)).toMatchObject({
      pages: [{ data: [{ submittedBy: { status: "SUSPENDED" } }] }],
    })
  })

  it("reconciles server data and invalidates only suspension state", async () => {
    mocks.liftAdminSuspension.mockResolvedValue({ suspension: liftedSuspension, user })
    const { result, queryClient, detailKey } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate(input))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(queryClient.getQueryData(detailKey)).toEqual(liftedSuspension)
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.admin.suspensions.lists,
      refetchType: "active",
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: detailKey,
      refetchType: "active",
    })
  })
})
