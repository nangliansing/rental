import { describe, expect, it } from "vitest"

import {
  formatBuildingFollowedSince,
  formatBuildingFollowerCount,
  formatBuildingFollowersEmptyPreview,
  formatBuildingFollowersModalAriaLabel,
  formatBuildingFollowersPreviewAriaLabel,
  formatBuildingFollowersSocialProof,
  getBuildingFollowerDisplayName,
  getBuildingFollowerListKey,
  getBuildingFollowersModalTitle,
  getBuildingFollowersSocialProofParts,
  normalizeBuildingFollowersBuildingId,
  normalizeFollowerTotal,
} from "./buildingFollowerDisplay"

describe("buildingFollowerDisplay", () => {
  it("formats follower counts defensively", () => {
    expect(formatBuildingFollowerCount(1)).toBe("1 follower")
    expect(formatBuildingFollowerCount(12)).toBe("12 followers")
    expect(formatBuildingFollowerCount(undefined)).toBe("0 followers")
    expect(formatBuildingFollowerCount(-3)).toBe("0 followers")
  })

  it("prefers display name, then name, then a stable fallback", () => {
    expect(
      getBuildingFollowerDisplayName({
        _id: "user-1",
        name: "Jane Doe",
        displayName: "Fetch Agent",
        profilePhoto: null,
        isVerified: false,
      }),
    ).toBe("Fetch Agent")

    expect(
      getBuildingFollowerDisplayName({
        _id: "user-1",
        name: "Jane Doe",
        displayName: null,
        profilePhoto: null,
        isVerified: false,
      }),
    ).toBe("Jane Doe")

    expect(getBuildingFollowerDisplayName(null, "abc123456789")).toBe(
      "User 456789",
    )
    expect(getBuildingFollowerDisplayName(null)).toBe("Unavailable follower")
  })

  it("formats followed since dates defensively", () => {
    expect(formatBuildingFollowedSince("2026-07-31T10:15:30.123Z")).toBe(
      "Followed Jul 31, 2026",
    )
    expect(formatBuildingFollowedSince(undefined)).toBe("Followed recently")
    expect(formatBuildingFollowedSince("not-a-date")).toBe("Followed recently")
  })

  it("builds stable list keys", () => {
    expect(
      getBuildingFollowerListKey({
        _id: "follow-1",
        userId: "user-1",
        buildingId: "building-1",
        createdAt: undefined,
        updatedAt: undefined,
        user: null,
      }),
    ).toBe("follow-1")
  })

  it("normalizes follower totals defensively", () => {
    expect(normalizeFollowerTotal(12.8)).toBe(12)
    expect(normalizeFollowerTotal(undefined)).toBe(0)
    expect(normalizeFollowerTotal(-1)).toBe(0)
  })

  it("normalizes building ids defensively", () => {
    expect(normalizeBuildingFollowersBuildingId(" building-1 ")).toBe(
      "building-1",
    )
    expect(normalizeBuildingFollowersBuildingId(undefined)).toBe("")
    expect(normalizeBuildingFollowersBuildingId("   ")).toBe("")
  })

  it("builds social proof parts for empty and follower states", () => {
    const follower = (name: string, id: string) => ({
      _id: `follow-${id}`,
      userId: id,
      buildingId: "building-1",
      createdAt: undefined,
      updatedAt: undefined,
      user: {
        _id: id,
        name,
        displayName: name,
        profilePhoto: null,
        isVerified: true,
      },
    })

    expect(getBuildingFollowersSocialProofParts([], 0)).toEqual({
      kind: "empty",
      text: "No one follows this building yet",
    })

    expect(
      getBuildingFollowersSocialProofParts([follower("Alex", "user-1")], 48),
    ).toEqual({
      kind: "followers",
      primaryName: "Alex",
      suffix: " and 47 others follow this building",
      fullText: null,
      isVerified: true,
    })
  })

  it("formats social proof copy by follower count", () => {
    const follower = (name: string, id: string) => ({
      _id: `follow-${id}`,
      userId: id,
      buildingId: "building-1",
      createdAt: undefined,
      updatedAt: undefined,
      user: {
        _id: id,
        name,
        displayName: name,
        profilePhoto: null,
        isVerified: false,
      },
    })

    expect(formatBuildingFollowersSocialProof([], 0)).toBe("")
    expect(
      formatBuildingFollowersSocialProof([follower("Alex", "user-1")], 1),
    ).toBe("Alex follows this building")
    expect(
      formatBuildingFollowersSocialProof(
        [follower("Alex", "user-1"), follower("Sam", "user-2")],
        2,
      ),
    ).toBe("Alex and 1 other follow this building")
    expect(
      formatBuildingFollowersSocialProof([follower("Alex", "user-1")], 48),
    ).toBe("Alex and 47 others follow this building")
  })

  it("formats the empty preview copy", () => {
    expect(formatBuildingFollowersEmptyPreview()).toBe(
      "No one follows this building yet",
    )
  })

  it("formats preview and modal aria labels defensively", () => {
    expect(formatBuildingFollowersPreviewAriaLabel("Sky Tower", 1)).toBe(
      "View 1 follower of Sky Tower",
    )
    expect(formatBuildingFollowersPreviewAriaLabel("Sky Tower", 48)).toBe(
      "View all 48 followers of Sky Tower",
    )
    expect(formatBuildingFollowersPreviewAriaLabel(undefined, 0)).toBe(
      "View followers of this building",
    )
    expect(formatBuildingFollowersModalAriaLabel("Sky Tower")).toBe(
      "Followers of Sky Tower",
    )
    expect(formatBuildingFollowersModalAriaLabel(undefined)).toBe(
      "Followers of this building",
    )
    expect(getBuildingFollowersModalTitle("Sky Tower")).toBe("Sky Tower")
    expect(getBuildingFollowersModalTitle("  ")).toBe("Building")
  })
})
