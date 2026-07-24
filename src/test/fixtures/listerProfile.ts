import type { ListerProfile } from "@/features/agent/api"
import { listingPhoto } from "@/test/fixtures/listings"

export function createListerProfileResponse(overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    data: {
      agentProfile: {
        _id: "agent-1",
        userId: "user-1",
        displayName: "Nang Lian Sing",
        profilePhoto: listingPhoto,
        description: "Friendly lister",
        phone: "0812345678",
        lineUrl: "https://line.me/ti/p/example",
        whatsappPhone: null,
        telegramUrl: null,
        viberPhone: null,
        supportLanguages: ["English", "Thai"],
        isVerified: true,
        isOnline: true,
        isActive: true,
        createdAt: "2026-07-20T00:00:00.000Z",
        reviewSummary: {
          averageRating: 4.5,
          reviewCount: 2,
          ratingCounts: {
            oneStar: 0,
            twoStars: 0,
            threeStars: 0,
            fourStars: 1,
            fiveStars: 1,
          },
          tagCounts: [],
        },
        listingSummary: {
          activeCount: 3,
          pendingCount: 0,
          approvedCount: 3,
          rejectedCount: 0,
        },
        ...overrides,
      },
    },
  }
}

export function createListerProfile(
  overrides: Partial<ListerProfile> = {},
): ListerProfile {
  return {
    _id: "agent-1",
    userId: "user-1",
    displayName: "Nang Lian Sing",
    profilePhoto: listingPhoto,
    description: "Friendly lister",
    phone: "0812345678",
    lineUrl: "https://line.me/ti/p/example",
    whatsappPhone: null,
    telegramUrl: null,
    viberPhone: null,
    supportLanguages: ["English", "Thai"],
    isVerified: true,
    isOnline: true,
    isActive: true,
    createdAt: "2026-07-20T00:00:00.000Z",
    reviewSummary: {
      averageRating: 4.5,
      reviewCount: 2,
      ratingCounts: {
        oneStar: 0,
        twoStars: 0,
        threeStars: 0,
        fourStars: 1,
        fiveStars: 1,
      },
      tagCounts: [],
    },
    listingSummary: {
      activeCount: 3,
      pendingCount: 0,
      approvedCount: 3,
      rejectedCount: 0,
    },
    ...overrides,
  }
}
