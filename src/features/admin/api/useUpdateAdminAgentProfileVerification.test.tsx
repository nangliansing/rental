import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

const mocks = vi.hoisted(() => ({
  updateAdminAgentProfileVerification: vi.fn(),
}))

vi.mock("./updateAdminAgentProfileVerification", () => ({
  updateAdminAgentProfileVerification:
    mocks.updateAdminAgentProfileVerification,
}))

import { useUpdateAdminAgentProfileVerification } from "./useUpdateAdminAgentProfileVerification"

const input = {
  agentProfileId: "profile-1",
  isVerified: true,
  reason: "Identity checked",
}

const profile = {
  _id: "profile-1",
  userId: "user-1",
  displayName: "Agent",
  profilePhoto: null,
  description: "",
  phone: "",
  lineUrl: "",
  whatsappPhone: "",
  telegramUrl: "",
  viberPhone: "",
  supportLanguages: [],
  isOnline: true,
  isDeleted: false,
  deletedAt: null,
  deletedBy: null,
  deleteReason: null,
  isVerified: true,
  verifiedBy: "admin-1",
  verifiedAt: "2026-07-22T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-07-22T00:00:00.000Z",
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const profileKey = queryKeys.profiles.detail("profile-1")
  const listingKey = queryKeys.listings.publicDetail("listing-1", "user-2")
  const adminUserKey = queryKeys.admin.users.detail("user-1")
  const adminReportKey = queryKeys.admin.reports.detail("report-1")
  const originalProjection = {
    _id: "profile-1",
    userId: "user-1",
    displayName: "Agent",
    isVerified: false,
    verifiedBy: null,
    verifiedAt: null,
  }

  queryClient.setQueryData(profileKey, originalProjection)
  queryClient.setQueryData(listingKey, {
    listing: { _id: "listing-1", agentProfile: originalProjection },
  })
  queryClient.setQueryData(adminUserKey, {
    _id: "user-1",
    agentProfile: originalProjection,
  })
  queryClient.setQueryData(adminReportKey, {
    _id: "report-1",
    listingAgentProfile: originalProjection,
  })

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  return {
    ...renderHook(() => useUpdateAdminAgentProfileVerification(), {
      wrapper: Wrapper,
    }),
    adminReportKey,
    adminUserKey,
    listingKey,
    profileKey,
    queryClient,
  }
}

describe("useUpdateAdminAgentProfileVerification", () => {
  beforeEach(() => {
    mocks.updateAdminAgentProfileVerification.mockReset()
  })

  it("optimistically patches every cached agent-profile projection", async () => {
    let resolve!: (value: typeof profile) => void
    mocks.updateAdminAgentProfileVerification.mockImplementation(
      () => new Promise((done) => { resolve = done }),
    )
    const { result, queryClient, profileKey, listingKey, adminUserKey, adminReportKey } = setup()

    act(() => result.current.mutate(input))

    await waitFor(() =>
      expect(queryClient.getQueryData(profileKey)).toMatchObject({
        isVerified: true,
      }),
    )
    expect(queryClient.getQueryData(listingKey)).toMatchObject({
      listing: { agentProfile: { isVerified: true } },
    })
    expect(queryClient.getQueryData(adminUserKey)).toMatchObject({
      agentProfile: { isVerified: true },
    })
    expect(queryClient.getQueryData(adminReportKey)).toMatchObject({
      listingAgentProfile: { isVerified: true },
    })

    await act(async () => resolve(profile))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("restores every exact snapshot when the request fails", async () => {
    mocks.updateAdminAgentProfileVerification.mockRejectedValue(
      new Error("Network error"),
    )
    const { result, queryClient, profileKey, listingKey, adminUserKey } = setup()

    act(() => result.current.mutate(input))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(queryClient.getQueryData(profileKey)).toMatchObject({
      isVerified: false,
      verifiedBy: null,
    })
    expect(queryClient.getQueryData(listingKey)).toMatchObject({
      listing: { agentProfile: { isVerified: false } },
    })
    expect(queryClient.getQueryData(adminUserKey)).toMatchObject({
      agentProfile: { isVerified: false },
    })
  })

  it("reconciles canonical verification metadata without invalidation", async () => {
    mocks.updateAdminAgentProfileVerification.mockResolvedValue(profile)
    const { result, queryClient, profileKey, listingKey } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate(input))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(queryClient.getQueryData(profileKey)).toMatchObject({
      isVerified: true,
      verifiedBy: "admin-1",
      verifiedAt: profile.verifiedAt,
      updatedAt: profile.updatedAt,
    })
    expect(queryClient.getQueryData(listingKey)).toMatchObject({
      listing: {
        agentProfile: {
          isVerified: true,
          verifiedBy: "admin-1",
        },
      },
    })
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("serializes repeated verification writes", async () => {
    let resolveFirst!: (value: typeof profile) => void
    mocks.updateAdminAgentProfileVerification
      .mockImplementationOnce(
        () => new Promise((done) => { resolveFirst = done }),
      )
      .mockResolvedValueOnce({ ...profile, isVerified: false })
    const { result } = setup()

    act(() => {
      result.current.mutate(input)
      result.current.mutate({ ...input, isVerified: false })
    })
    await waitFor(() =>
      expect(mocks.updateAdminAgentProfileVerification).toHaveBeenCalledTimes(1),
    )
    await act(async () => resolveFirst(profile))
    await waitFor(() =>
      expect(mocks.updateAdminAgentProfileVerification).toHaveBeenCalledTimes(2),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})
