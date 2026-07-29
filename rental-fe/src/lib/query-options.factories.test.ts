import { describe, expect, it } from "vitest"

import { adminQueries } from "@/features/admin/api/adminQueryOptions"
import { listerProfileQueryOptions } from "@/features/agent/api/useListerProfileById"
import { agentListingsQueryOptions } from "@/features/agent/api/useSearchListingsByAgent"
import { currentUserQueryOptions } from "@/features/auth/auth-query"
import { buildingQueryOptions } from "@/features/buildings/api/useBuildingById"
import { buildingNeighbourhoodQueryOptions } from "@/features/buildings/api/useBuildingNeighbourhood"
import { listerReviewsQueryOptions } from "@/features/lister-review/api/useSearchListerReviews"
import { listerReviewTeasersQueryOptions } from "@/features/listing/api/useListerReviewTeasers"
import { ownerListingQueryOptions } from "@/features/listing/api/useOwnerListingById"
import { publicListingQueryOptions } from "@/features/listing/api/usePublicListingById"
import { ownerListingsQueryOptions } from "@/features/listing/api/useSearchOwnerListings"
import { buildingsInMapQueryOptions } from "@/features/map-search/api/useSearchBuildingsInMap"
import { buildingsNearLinesQueryOptions } from "@/features/map-search/api/useSearchBuildingsNearLines"
import { buildingsNearbyQueryOptions } from "@/features/map-search/api/useSearchBuildingsNearby"
import { listingsInBuildingQueryOptions } from "@/features/map-search/api/useSearchListingsInBuilding"
import { notificationsQueryOptions } from "@/features/notifications/api/notificationQueryOptions"
import { ownerPendingPostsQueryOptions } from "@/features/pending-post/api/useSearchOwnerPendingPosts"
import { myAgentProfileQueryOptions } from "@/features/profile/api/useMyAgentProfile"
import { savedListingsQueryOptions } from "@/features/saved-listing/api/useSearchSavedListings"
import { queryKeys } from "@/lib/query-keys"

describe("query-options factories", () => {
  it("binds every standard detail factory to its central key", () => {
    const cases = [
      [currentUserQueryOptions(), queryKeys.auth.currentUser],
      [
        listerProfileQueryOptions("profile-1"),
        queryKeys.profiles.detail("profile-1"),
      ],
      [
        buildingQueryOptions("building-1"),
        queryKeys.buildings.detail("building-1"),
      ],
      [
        buildingNeighbourhoodQueryOptions({
          buildingId: "building-1",
          radiusM: 500,
          fetchRadiusM: 1_000,
        }),
        queryKeys.buildings.neighbourhood("building-1", {
          radiusM: 500,
          fetchRadiusM: 1_000,
        }),
      ],
      [
        ownerListingQueryOptions("listing-1"),
        queryKeys.listings.ownerDetail("listing-1"),
      ],
      [
        publicListingQueryOptions({
          listingId: "listing-1",
          viewerKey: "viewer-1",
        }),
        queryKeys.listings.publicDetail("listing-1", "viewer-1"),
      ],
      [myAgentProfileQueryOptions(), queryKeys.profiles.me],
    ] as const

    cases.forEach(([options, expectedKey]) => {
      expect(options.queryKey).toEqual(expectedKey)
      expect(options.enabled).not.toBe(false)
      expect(typeof options.queryFn).toBe("function")
    })
  })

  it("disables every ID-dependent detail query for missing IDs", () => {
    const disabled = [
      listerProfileQueryOptions(undefined),
      listerProfileQueryOptions("   "),
      buildingQueryOptions(undefined),
      buildingQueryOptions("   "),
      buildingNeighbourhoodQueryOptions({ buildingId: undefined }),
      buildingNeighbourhoodQueryOptions({ buildingId: " " }),
      ownerListingQueryOptions(undefined),
      ownerListingQueryOptions(" "),
      publicListingQueryOptions({ listingId: undefined }),
      publicListingQueryOptions({ listingId: "   " }),
      adminQueries.buildingEditRequestDetail(undefined),
      adminQueries.reportDetail(undefined),
      adminQueries.reviewReportDetail(undefined),
      adminQueries.suspensionDetail(undefined),
      adminQueries.userDetail(undefined),
    ]

    disabled.forEach(options => {
      expect(options.enabled).toBe(false)
      expect(typeof options.queryFn).toBe("function")
    })
  })

  it("honors explicit enabled=false for every query category", () => {
    const disabled = [
      listerProfileQueryOptions("profile-1", false),
      buildingQueryOptions("building-1", false),
      ownerListingQueryOptions("listing-1", false),
      myAgentProfileQueryOptions(false),
      notificationsQueryOptions(false),
      savedListingsQueryOptions({ enabled: false }),
      ownerListingsQueryOptions({ enabled: false }),
      ownerPendingPostsQueryOptions({ enabled: false }),
      agentListingsQueryOptions({
        agentProfileId: "profile-1",
        enabled: false,
      }),
      listerReviewsQueryOptions({
        listerProfileId: "profile-1",
        enabled: false,
      }),
      adminQueries.pendingPosts("PENDING", false),
      adminQueries.platformAdmins(false),
    ]

    disabled.forEach(options => expect(options.enabled).toBe(false))
  })

  it("configures every page-number query with the shared infinite contract", () => {
    const infiniteOptions = [
      notificationsQueryOptions(),
      savedListingsQueryOptions(),
      ownerListingsQueryOptions(),
      ownerPendingPostsQueryOptions(),
      agentListingsQueryOptions({ agentProfileId: "profile-1" }),
      listerReviewsQueryOptions({ listerProfileId: "profile-1" }),
      listingsInBuildingQueryOptions({
        buildingId: "building-1",
        filters: {},
      }),
      buildingsInMapQueryOptions({
        bounds: { north: 14, south: 13, east: 101, west: 100 },
        filters: {},
        enabled: true,
      }),
      buildingsNearLinesQueryOptions({
        geometry: {
          type: "LineString",
          coordinates: [
            [100, 13],
            [101, 14],
          ],
        },
        filters: {},
        enabled: true,
      }),
      adminQueries.pendingPosts("PENDING"),
      adminQueries.buildingEditRequests("PENDING"),
      adminQueries.reports("OPEN"),
      adminQueries.reviewReports("OPEN"),
      adminQueries.suspensions("ACTIVE"),
      adminQueries.platformAdmins(),
    ]

    infiniteOptions.forEach(options => {
      expect(options.initialPageParam).toBe(1)
      expect(typeof options.getNextPageParam).toBe("function")
      expect(typeof options.queryFn).toBe("function")
    })
  })

  it("preserves special cache policies", () => {
    expect(currentUserQueryOptions().retry).toBe(false)
    expect(currentUserQueryOptions().staleTime).toBe(5 * 60 * 1_000)
    expect(myAgentProfileQueryOptions().retry).toBe(false)
    expect(listerReviewTeasersQueryOptions({
      listerProfileId: "profile-1",
    }).staleTime).toBe(60_000)

    const reviewDetail = adminQueries.reviewReportDetail("report-1")
    expect(reviewDetail.retry).toBeTypeOf("function")
  })

  it("keeps map modes and viewer identities in distinct cache entries", () => {
    const nearby = buildingsNearbyQueryOptions({
      position: { lat: 13.7, lng: 100.6 },
      radiusMeters: 500,
      filters: {},
      enabled: true,
    })
    const area = buildingsInMapQueryOptions({
      bounds: { north: 14, south: 13, east: 101, west: 100 },
      filters: {},
      enabled: true,
    })
    const anonymous = publicListingQueryOptions({ listingId: "listing-1" })
    const viewer = publicListingQueryOptions({
      listingId: "listing-1",
      viewerKey: "viewer-1",
    })

    expect(nearby.queryKey).not.toEqual(area.queryKey)
    expect(anonymous.queryKey).not.toEqual(viewer.queryKey)
  })
})
