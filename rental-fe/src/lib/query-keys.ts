type OwnerListingKeyInput = {
  visibility: string
  sort: string
  limit: number
}

type AgentListingKeyInput = {
  agentProfileId: string
  sort: string
  limit: number
}

type ListerReviewKeyInput = {
  listerProfileId: string
  sort: string
  limit: number
}

export const queryKeys = {
  auth: {
    currentUser: ["current-user"] as const,
  },
  profiles: {
    all: ["agent-profiles"] as const,
    me: ["agent-profiles", "me"] as const,
    details: ["agent-profiles", "detail"] as const,
    detail: (agentProfileId: string) =>
      ["agent-profiles", "detail", agentProfileId] as const,
  },
  notifications: {
    me: ["notifications", "me"] as const,
  },
  pendingPosts: {
    ownerLists: ["owner-pending-posts"] as const,
    ownerList: ({ status, limit }: { status: string; limit: number }) =>
      ["owner-pending-posts", status, limit] as const,
  },
  savedListings: {
    all: ["saved-listings"] as const,
    list: ({ limit }: { limit: number }) =>
      ["saved-listings", limit] as const,
  },
  listerReviews: {
    lists: ["lister-reviews"] as const,
    byLister: (listerProfileId: string) =>
      ["lister-reviews", listerProfileId] as const,
    list: ({ listerProfileId, sort, limit }: ListerReviewKeyInput) =>
      ["lister-reviews", listerProfileId, sort, limit] as const,
  },
  agentListings: {
    lists: ["agent-listings"] as const,
    list: ({ agentProfileId, sort, limit }: AgentListingKeyInput) =>
      ["agent-listings", agentProfileId, sort, limit] as const,
  },
  buildings: {
    detail: (buildingId: string | undefined) =>
      ["building", buildingId] as const,
    neighbourhood: (
      buildingId: string | undefined,
      {
        radiusM,
        fetchRadiusM,
      }: {
        radiusM: number
        fetchRadiusM: number
      },
    ) =>
      ["building", buildingId, "neighbourhood", radiusM, fetchRadiusM] as const,
  },
  mapSearch: {
    buildings: ["building-search"] as const,
    buildingResults: <TBounds, TFilters>({
      bounds,
      filters,
      limit,
      includeBuildingsWithoutMatchingListings,
    }: {
      bounds: TBounds
      filters: TFilters
      limit: number
      includeBuildingsWithoutMatchingListings?: boolean
    }) =>
      [
        "building-search",
        "area",
        bounds,
        filters,
        limit,
        includeBuildingsWithoutMatchingListings,
      ] as const,
    nearbyBuildingResults: <TPosition, TFilters>({
      position,
      radiusMeters,
      filters,
      limit,
      includeBuildingsWithoutMatchingListings,
    }: {
      position: TPosition
      radiusMeters: number
      filters: TFilters
      limit: number
      includeBuildingsWithoutMatchingListings?: boolean
    }) =>
      [
        "building-search",
        "nearby",
        position,
        radiusMeters,
        filters,
        limit,
        includeBuildingsWithoutMatchingListings,
      ] as const,
    nearLinesBuildingResults: <TGeometry, TFilters>({
      geometry,
      distanceMeters,
      filters,
      limit,
      includeBuildingsWithoutMatchingListings,
    }: {
      geometry: TGeometry
      distanceMeters: number
      filters: TFilters
      limit: number
      includeBuildingsWithoutMatchingListings?: boolean
    }) =>
      [
        "building-search",
        "near-lines",
        geometry,
        distanceMeters,
        filters,
        limit,
        includeBuildingsWithoutMatchingListings,
      ] as const,
    listingsInBuilding: ["search-listings-in-building"] as const,
    listingsInBuildingResults: <TFilters>({
      buildingId,
      filters,
      limit,
    }: {
      buildingId: string | undefined
      filters: TFilters
      limit: number
    }) =>
      ["search-listings-in-building", buildingId, filters, limit] as const,
  },
  listings: {
    ownerLists: ["owner-listings"] as const,
    ownerList: ({ visibility, sort, limit }: OwnerListingKeyInput) =>
      ["owner-listings", visibility, sort, limit] as const,
    ownerDetails: ["owner-listing"] as const,
    ownerDetail: (listingId: string | undefined) =>
      ["owner-listing", listingId] as const,
    publicDetails: ["public-listing"] as const,
    publicListingDetails: (listingId: string | undefined) =>
      ["public-listing", listingId] as const,
    publicDetail: (
      listingId: string | undefined,
      viewerKey?: string | null,
    ) => ["public-listing", listingId, viewerKey ?? "anonymous"] as const,
  },
  admin: {
    pendingPosts: {
      lists: ["admin-pending-posts"] as const,
      list: (status: string | undefined) =>
        ["admin-pending-posts", status] as const,
    },
    buildingEditRequests: {
      lists: ["admin-building-edit-requests"] as const,
      list: (status: string | undefined) =>
        ["admin-building-edit-requests", status] as const,
      details: ["admin-building-edit-request"] as const,
      detail: (requestId: string | undefined) =>
        ["admin-building-edit-request", requestId] as const,
    },
    reports: {
      lists: ["admin-reports"] as const,
      list: (status: string | undefined) =>
        ["admin-reports", status] as const,
      details: ["admin-report"] as const,
      detail: (reportId: string | undefined) =>
        ["admin-report", reportId] as const,
    },
    reviewReports: {
      lists: ["admin-review-reports"] as const,
      list: (status: string | undefined) =>
        ["admin-review-reports", status] as const,
      details: ["admin-review-report"] as const,
      detail: (reviewReportId: string | undefined) =>
        ["admin-review-report", reviewReportId] as const,
    },
    suspensions: {
      lists: ["admin-suspensions"] as const,
      list: (status: string | undefined) =>
        ["admin-suspensions", status] as const,
      details: ["admin-suspension"] as const,
      detail: (suspensionId: string | undefined) =>
        ["admin-suspension", suspensionId] as const,
    },
    platformAdmins: {
      list: ["admin-platform-admins"] as const,
    },
    users: {
      details: ["admin-user"] as const,
      detail: (userId: string | undefined) => ["admin-user", userId] as const,
    },
  },
} as const
