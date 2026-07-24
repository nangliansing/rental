import { describe, expect, it } from "vitest"

import { ApiError } from "@/lib/api-client"
import { createListerProfileResponse } from "@/test/fixtures/listerProfile"

import { parseListerProfileResponse } from "./getListerProfileById"

describe("parseListerProfileResponse", () => {
  it("normalizes lister profile fields and summaries", () => {
    const parsed = parseListerProfileResponse(createListerProfileResponse())

    expect(parsed).toMatchObject({
      _id: "agent-1",
      userId: "user-1",
      displayName: "Nang Lian Sing",
      phone: "0812345678",
      isOnline: true,
      isActive: true,
      listingSummary: {
        activeCount: 3,
        pendingCount: 0,
        approvedCount: 3,
        rejectedCount: 0,
      },
    })
    expect(parsed.reviewSummary?.reviewCount).toBe(2)
  })

  it("defaults missing listing summary counts to zero", () => {
    const parsed = parseListerProfileResponse(
      createListerProfileResponse({ listingSummary: undefined }),
    )

    expect(parsed.listingSummary).toEqual({
      activeCount: 0,
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
    })
  })

  it("allows userId to be null when absent", () => {
    const parsed = parseListerProfileResponse(
      createListerProfileResponse({ userId: undefined }),
    )

    expect(parsed.userId).toBeNull()
  })

  it("throws when agent profile id is missing", () => {
    expect(() =>
      parseListerProfileResponse({
        success: true,
        data: { agentProfile: { displayName: "Missing id" } },
      }),
    ).toThrow(ApiError)
  })
})
