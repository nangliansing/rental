import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useBuildingSummaryActions } from "./useBuildingSummaryActions"

const mockNavigate = vi.fn()

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}))

vi.mock("@/features/profile/api/useMyAgentProfile", () => ({
  useMyAgentProfile: vi.fn(),
}))

import { useAuth } from "@/features/auth/hooks/useAuth"
import { useMyAgentProfile } from "@/features/profile/api/useMyAgentProfile"

describe("useBuildingSummaryActions", () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    } as never)
    vi.mocked(useMyAgentProfile).mockReturnValue({
      canCreateListing: false,
      isPending: false,
    } as never)
  })

  it("enables management actions for signed-in users with a profile", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    } as never)
    vi.mocked(useMyAgentProfile).mockReturnValue({
      canCreateListing: true,
      isPending: false,
    } as never)

    const { result } = renderHook(() =>
      useBuildingSummaryActions({ buildingId: "building-1" }),
    )

    expect(result.current.hasManagementActions).toBe(true)
    result.current.handleListHere?.()
    result.current.handleRequestEdit?.()

    expect(mockNavigate).toHaveBeenNthCalledWith(
      1,
      "/listings/new?buildingId=building-1",
    )
    expect(mockNavigate).toHaveBeenNthCalledWith(
      2,
      "/buildings/building-1/edit",
    )
  })

  it("disables management actions while auth or profile is loading", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: true,
    } as never)

    const authLoading = renderHook(() =>
      useBuildingSummaryActions({ buildingId: "building-1" }),
    )
    expect(authLoading.result.current.hasManagementActions).toBe(false)

    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    } as never)
    vi.mocked(useMyAgentProfile).mockReturnValue({
      canCreateListing: false,
      isPending: true,
    } as never)

    const profileLoading = renderHook(() =>
      useBuildingSummaryActions({ buildingId: "building-1" }),
    )
    expect(profileLoading.result.current.hasManagementActions).toBe(false)
  })

  it("disables management actions without a building id or profile", () => {
    const missingId = renderHook(() =>
      useBuildingSummaryActions({ buildingId: "" }),
    )
    expect(missingId.result.current.hasManagementActions).toBe(false)

    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    } as never)
    vi.mocked(useMyAgentProfile).mockReturnValue({
      canCreateListing: false,
      isPending: false,
    } as never)

    const missingProfile = renderHook(() =>
      useBuildingSummaryActions({ buildingId: "building-1" }),
    )
    expect(missingProfile.result.current.hasManagementActions).toBe(false)
  })

  it("respects hideActions and custom handlers", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    } as never)
    vi.mocked(useMyAgentProfile).mockReturnValue({
      canCreateListing: true,
      isPending: false,
    } as never)

    const onListHere = vi.fn()
    const onRequestEdit = vi.fn()

    const hidden = renderHook(() =>
      useBuildingSummaryActions({
        buildingId: "building-1",
        hideActions: true,
      }),
    )
    expect(hidden.result.current.hasManagementActions).toBe(false)

    const custom = renderHook(() =>
      useBuildingSummaryActions({
        buildingId: "building-1",
        onListHere,
        onRequestEdit,
      }),
    )

    custom.result.current.handleListHere?.()
    custom.result.current.handleRequestEdit?.()

    expect(onListHere).toHaveBeenCalledOnce()
    expect(onRequestEdit).toHaveBeenCalledOnce()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
