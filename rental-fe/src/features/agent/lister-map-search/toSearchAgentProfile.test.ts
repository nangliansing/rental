import { describe, expect, it } from "vitest"

import { createListerProfile } from "@/test/fixtures/listerProfile"
import { listingPhoto } from "@/test/fixtures/listings"

import {
  listerProfileToSearchAgentProfile,
  toSearchAgentProfileFromSeed,
} from "./toSearchAgentProfile"

const emptyReviewSummary = {
  averageRating: 0,
  reviewCount: 0,
  ratingCounts: {
    oneStar: 0,
    twoStars: 0,
    threeStars: 0,
    fourStars: 0,
    fiveStars: 0,
  },
  tagCounts: [],
}

describe("toSearchAgentProfileFromSeed", () => {
  it("maps a full seed to a search agent profile with safe defaults", () => {
    expect(
      toSearchAgentProfileFromSeed({
        _id: "agent-1",
        displayName: "Nang Lian Sing",
        profilePhoto: listingPhoto,
      }),
    ).toEqual({
      _id: "agent-1",
      displayName: "Nang Lian Sing",
      profilePhoto: listingPhoto,
      description: null,
      supportLanguages: [],
      reviewSummary: emptyReviewSummary,
      isVerified: false,
      isOnline: false,
      createdAt: "",
      updatedAt: "",
    })
  })

  it("maps a minimal seed and preserves null optional fields", () => {
    expect(
      toSearchAgentProfileFromSeed({
        _id: "agent-1",
        displayName: null,
        profilePhoto: null,
      }),
    ).toEqual({
      _id: "agent-1",
      displayName: null,
      profilePhoto: null,
      description: null,
      supportLanguages: [],
      reviewSummary: emptyReviewSummary,
      isVerified: false,
      isOnline: false,
      createdAt: "",
      updatedAt: "",
    })
  })

  it("trims surrounding whitespace from the seed id", () => {
    expect(
      toSearchAgentProfileFromSeed({
        _id: "  agent-42  ",
        displayName: "Nang",
        profilePhoto: null,
      })._id,
    ).toBe("agent-42")
  })

  it("does not mutate the input seed", () => {
    const seed = {
      _id: "  agent-1  ",
      displayName: "Nang",
      profilePhoto: listingPhoto,
    }
    const snapshot = { ...seed, profilePhoto: listingPhoto }

    toSearchAgentProfileFromSeed(seed)

    expect(seed).toEqual(snapshot)
  })

  it("returns isolated review summaries for each conversion", () => {
    const first = toSearchAgentProfileFromSeed({
      _id: "agent-1",
      displayName: null,
      profilePhoto: null,
    })
    const second = toSearchAgentProfileFromSeed({
      _id: "agent-2",
      displayName: null,
      profilePhoto: null,
    })

    first.reviewSummary.reviewCount = 99

    expect(second.reviewSummary.reviewCount).toBe(0)
    expect(first.reviewSummary).not.toBe(second.reviewSummary)
  })

  it("completes in bounded time for long seed ids", () => {
    const startedAt = performance.now()

    const profile = toSearchAgentProfileFromSeed({
      _id: "a".repeat(10_000),
      displayName: "Nang",
      profilePhoto: null,
    })

    expect(performance.now() - startedAt).toBeLessThan(100)
    expect(profile._id).toHaveLength(10_000)
  })
})

describe("listerProfileToSearchAgentProfile", () => {
  it("maps a full lister profile to a search agent profile", () => {
    const listerProfile = createListerProfile()

    expect(listerProfileToSearchAgentProfile(listerProfile)).toEqual({
      _id: listerProfile._id,
      displayName: listerProfile.displayName,
      profilePhoto: listerProfile.profilePhoto,
      description: listerProfile.description,
      supportLanguages: listerProfile.supportLanguages,
      reviewSummary: listerProfile.reviewSummary,
      isVerified: listerProfile.isVerified,
      isOnline: listerProfile.isOnline,
      createdAt: listerProfile.createdAt,
      updatedAt: "",
    })
  })

  it("falls back to an empty review summary when one is missing", () => {
    const listerProfile = createListerProfile({ reviewSummary: undefined })

    expect(listerProfileToSearchAgentProfile(listerProfile).reviewSummary).toEqual(
      emptyReviewSummary,
    )
  })

  it("falls back to an empty createdAt when one is missing", () => {
    const listerProfile = createListerProfile({
      createdAt: undefined as unknown as string,
    })

    expect(listerProfileToSearchAgentProfile(listerProfile).createdAt).toBe("")
  })

  it("always sets updatedAt to an empty string", () => {
    expect(
      listerProfileToSearchAgentProfile(createListerProfile()).updatedAt,
    ).toBe("")
  })

  it("copies supportLanguages defensively", () => {
    const listerProfile = createListerProfile({
      supportLanguages: ["English", "Thai"],
    })

    const mapped = listerProfileToSearchAgentProfile(listerProfile)

    expect(mapped.supportLanguages).toEqual(["English", "Thai"])
    expect(mapped.supportLanguages).not.toBe(listerProfile.supportLanguages)

    mapped.supportLanguages.push("Japanese")

    expect(listerProfile.supportLanguages).toEqual(["English", "Thai"])
  })

  it("does not mutate the input lister profile", () => {
    const listerProfile = createListerProfile()
    const snapshot = {
      ...listerProfile,
      supportLanguages: [...listerProfile.supportLanguages],
      profilePhoto: listerProfile.profilePhoto,
      reviewSummary: listerProfile.reviewSummary
        ? {
            ...listerProfile.reviewSummary,
            ratingCounts: { ...listerProfile.reviewSummary.ratingCounts },
            tagCounts: [...listerProfile.reviewSummary.tagCounts],
          }
        : undefined,
    }

    listerProfileToSearchAgentProfile(listerProfile)

    expect(listerProfile).toEqual(snapshot)
  })

  it("returns isolated empty review summaries when the profile has none", () => {
    const first = listerProfileToSearchAgentProfile(
      createListerProfile({ _id: "agent-1", reviewSummary: undefined }),
    )
    const second = listerProfileToSearchAgentProfile(
      createListerProfile({ _id: "agent-2", reviewSummary: undefined }),
    )

    first.reviewSummary.reviewCount = 5

    expect(second.reviewSummary.reviewCount).toBe(0)
    expect(first.reviewSummary).not.toBe(second.reviewSummary)
  })

  it("completes in bounded time for large language lists", () => {
    const listerProfile = createListerProfile({
      supportLanguages: Array.from({ length: 1_000 }, (_, index) => `lang-${index}`),
    })
    const startedAt = performance.now()

    const mapped = listerProfileToSearchAgentProfile(listerProfile)

    expect(performance.now() - startedAt).toBeLessThan(100)
    expect(mapped.supportLanguages).toHaveLength(1_000)
  })
})
