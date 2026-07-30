import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

import {
  adminUserProjectionKeys,
  patchAdminUserProjections,
} from "./adminUserProjectionCache"

const userId = "user-1"

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}

function authUser(extra: Record<string, unknown> = {}) {
  return {
    _id: userId,
    email: "user@example.com",
    authProvider: "GOOGLE",
    role: "ADMIN",
    status: "ACTIVE",
    ...extra,
  }
}

describe("adminUserProjectionKeys", () => {
  it("includes every admin cache family that can embed user projections", () => {
    expect(adminUserProjectionKeys(userId)).toEqual(
      expect.arrayContaining([
        queryKeys.admin.users.detail(userId),
        queryKeys.admin.reports.details,
        queryKeys.admin.reviewReports.details,
        queryKeys.admin.suspensions.details,
      ]),
    )
  })
})

describe("patchAdminUserProjections", () => {
  it("patches nested user projections across related admin families", () => {
    const queryClient = createQueryClient()
    const userKey = queryKeys.admin.users.detail(userId)
    const reportKey = queryKeys.admin.reviewReports.detail("report-1")
    const user = authUser()
    queryClient.setQueryData(userKey, user)
    queryClient.setQueryData(reportKey, {
      _id: "report-1",
      reviewedBy: user,
    })

    patchAdminUserProjections(queryClient, userId, { role: "USER" })

    expect(queryClient.getQueryData(userKey)).toMatchObject({ role: "USER" })
    expect(queryClient.getQueryData(reportKey)).toMatchObject({
      reviewedBy: { role: "USER" },
    })
  })

  it("does not patch unrelated records that only share the same _id", () => {
    const queryClient = createQueryClient()
    const key = queryKeys.admin.reports.detail("report-1")
    const unrelated = { _id: userId, listingId: "listing-1" }
    queryClient.setQueryData(key, unrelated)

    patchAdminUserProjections(queryClient, userId, { role: "USER" })

    expect(queryClient.getQueryData(key)).toEqual(unrelated)
  })

  it("ignores undefined change entries", () => {
    const queryClient = createQueryClient()
    const key = queryKeys.admin.users.detail(userId)
    const current = authUser({ role: "ADMIN" })
    queryClient.setQueryData(key, current)

    patchAdminUserProjections(queryClient, userId, { role: undefined })

    expect(queryClient.getQueryData(key)).toEqual(current)
  })

  it("is a no-op when every change entry is undefined", () => {
    const queryClient = createQueryClient()
    const setQueriesData = vi.spyOn(queryClient, "setQueriesData")
    queryClient.setQueryData(queryKeys.admin.users.detail(userId), authUser())

    patchAdminUserProjections(queryClient, userId, {
      role: undefined,
      status: undefined,
    })

    expect(setQueriesData).not.toHaveBeenCalled()
  })

  it("preserves sibling references when only one nested projection changes", () => {
    const queryClient = createQueryClient()
    const key = queryKeys.admin.suspensions.detail("suspension-1")
    const keep = authUser({ _id: "user-2", email: "two@example.com" })
    queryClient.setQueryData(key, {
      _id: "suspension-1",
      liftedBy: authUser(),
      createdBy: keep,
    })

    patchAdminUserProjections(queryClient, userId, { status: "SUSPENDED" })

    const result = queryClient.getQueryData<{
      createdBy: unknown
      liftedBy: { status: string }
    }>(key)
    expect(result?.createdBy).toBe(keep)
    expect(result?.liftedBy).toMatchObject({ status: "SUSPENDED" })
  })

  it("leaves malformed cache values untouched instead of throwing", () => {
    const queryClient = createQueryClient()
    const key = queryKeys.admin.users.detail(userId)
    const malformed = { pages: [{ data: null }] }
    queryClient.setQueryData(key, malformed)

    expect(() =>
      patchAdminUserProjections(queryClient, userId, { role: "USER" }),
    ).not.toThrow()
    expect(queryClient.getQueryData(key)).toBe(malformed)
  })

  it("leaves cache values unchanged when nested access throws", () => {
    const queryClient = createQueryClient()
    const key = queryKeys.admin.reports.detail("report-1")
    const throwing = {
      get reviewedBy() {
        throw new Error("reviewedBy failed")
      },
    }
    queryClient.setQueryData(key, throwing)

    expect(() =>
      patchAdminUserProjections(queryClient, userId, { role: "USER" }),
    ).not.toThrow()
    expect(queryClient.getQueryData(key)).toBe(throwing)
  })
})
