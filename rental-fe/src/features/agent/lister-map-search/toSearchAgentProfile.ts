import type { ListerReviewSummary } from "@/features/lister-review/api"

import type { ListerProfile } from "../api/getListerProfileById"
import type { SearchAgentProfile } from "../api/searchAgentProfiles"
import type { ListerMapSearchSeed } from "./types"

const EMPTY_REVIEW_SUMMARY: ListerReviewSummary = {
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

function createEmptyReviewSummary(): ListerReviewSummary {
  return {
    ...EMPTY_REVIEW_SUMMARY,
    ratingCounts: { ...EMPTY_REVIEW_SUMMARY.ratingCounts },
    tagCounts: [],
  }
}

export function toSearchAgentProfileFromSeed(
  seed: ListerMapSearchSeed,
): SearchAgentProfile {
  return {
    _id: seed._id.trim(),
    displayName: seed.displayName,
    profilePhoto: seed.profilePhoto,
    description: null,
    supportLanguages: [],
    reviewSummary: createEmptyReviewSummary(),
    isVerified: false,
    isOnline: false,
    createdAt: "",
    updatedAt: "",
  }
}

export function listerProfileToSearchAgentProfile(
  profile: ListerProfile,
): SearchAgentProfile {
  return {
    _id: profile._id,
    displayName: profile.displayName,
    profilePhoto: profile.profilePhoto,
    description: profile.description,
    supportLanguages: [...profile.supportLanguages],
    reviewSummary: profile.reviewSummary ?? createEmptyReviewSummary(),
    isVerified: profile.isVerified,
    isOnline: profile.isOnline,
    createdAt: profile.createdAt ?? "",
    updatedAt: "",
  }
}
