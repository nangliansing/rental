type OwnerListingKeyInput = {
  filter: string
  sort: string
  limit: number
}

type AgentListingKeyInput = {
  agentProfileId: string
  filter: string
  sort: string
  limit: number
}

type ListerReviewKeyInput = {
  listerProfileId: string
  sort: string
  limit: number
}

/**
 * Query-key identity is owned by this module. Keep key segments JSON-safe and
 * build child keys from their family prefix so partial matching remains
 * predictable.
 */
const key = <const TSegments extends readonly unknown[]>(...segments: TSegments) =>
  segments

const childKey = <
  const TPrefix extends readonly unknown[],
  const TSegments extends readonly unknown[],
>(
  prefix: TPrefix,
  ...segments: TSegments
) => [...prefix, ...segments] as const

const roots = {
  auth: key("current-user"),
  profiles: key("agent-profiles"),
  notifications: key("notifications"),
  ownerPendingPosts: key("owner-pending-posts"),
  savedListings: key("saved-listings"),
  buildingFollows: key("building-follows"),
  listerReviews: key("lister-reviews"),
  listerReviewTeasers: key("lister-review-teasers"),
  agentListings: key("agent-listings"),
  buildings: key("building"),
  buildingSearch: key("building-search"),
  listingsInBuilding: key("search-listings-in-building"),
  ownerListings: key("owner-listings"),
  ownerListingDetails: key("owner-listing"),
  publicListingDetails: key("public-listing"),
  adminPendingPosts: key("admin-pending-posts"),
  adminBuildingEditRequests: key("admin-building-edit-requests"),
  adminBuildingEditRequestDetails: key("admin-building-edit-request"),
  adminReports: key("admin-reports"),
  adminReportDetails: key("admin-report"),
  adminReviewReports: key("admin-review-reports"),
  adminReviewReportDetails: key("admin-review-report"),
  adminSuspensions: key("admin-suspensions"),
  adminSuspensionDetails: key("admin-suspension"),
  adminPlatformAdmins: key("admin-platform-admins"),
  adminUserDetails: key("admin-user"),
} as const

export const queryKeys = {
  auth: {
    all: roots.auth,
    currentUser: roots.auth,
  },
  profiles: {
    all: roots.profiles,
    me: childKey(roots.profiles, "me"),
    details: childKey(roots.profiles, "detail"),
    detail: (agentProfileId: string) =>
      childKey(roots.profiles, "detail", agentProfileId),
  },
  notifications: {
    all: roots.notifications,
    me: childKey(roots.notifications, "me"),
  },
  pendingPosts: {
    all: roots.ownerPendingPosts,
    ownerLists: roots.ownerPendingPosts,
    ownerList: ({ status, limit }: { status: string; limit: number }) =>
      childKey(roots.ownerPendingPosts, status, limit),
  },
  savedListings: {
    all: roots.savedListings,
    lists: roots.savedListings,
    list: ({ limit }: { limit: number }) =>
      childKey(roots.savedListings, limit),
  },
  buildingFollows: {
    all: roots.buildingFollows,
    lists: roots.buildingFollows,
    list: ({ limit }: { limit: number }) =>
      childKey(roots.buildingFollows, limit),
  },
  listerReviews: {
    all: roots.listerReviews,
    lists: roots.listerReviews,
    byLister: (listerProfileId: string) =>
      childKey(roots.listerReviews, listerProfileId),
    list: ({ listerProfileId, sort, limit }: ListerReviewKeyInput) =>
      childKey(roots.listerReviews, listerProfileId, sort, limit),
  },
  /**
   * Separate namespace from `listerReviews`: teasers cache a flat single page,
   * while `listerReviews` caches infinite pages. Keeping them apart stops
   * review mutations from patching one cache with the other's shape.
   */
  listerReviewTeasers: {
    all: roots.listerReviewTeasers,
    lists: roots.listerReviewTeasers,
    byLister: (listerProfileId: string) =>
      childKey(roots.listerReviewTeasers, listerProfileId),
    list: ({ listerProfileId, sort, limit }: ListerReviewKeyInput) =>
      childKey(roots.listerReviewTeasers, listerProfileId, sort, limit),
  },
  agentListings: {
    all: roots.agentListings,
    lists: roots.agentListings,
    list: ({ agentProfileId, filter, sort, limit }: AgentListingKeyInput) =>
      childKey(roots.agentListings, agentProfileId, filter, sort, limit),
  },
  buildings: {
    all: roots.buildings,
    details: roots.buildings,
    detail: (buildingId: string | undefined) =>
      childKey(roots.buildings, buildingId),
    neighbourhood: (
      buildingId: string | undefined,
      {
        radiusM,
        fetchRadiusM,
      }: {
        radiusM: number
        fetchRadiusM: number
      },
    ) => childKey(
      roots.buildings,
      buildingId,
      "neighbourhood",
      radiusM,
      fetchRadiusM,
    ),
  },
  mapSearch: {
    buildings: roots.buildingSearch,
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
    }) => childKey(
        roots.buildingSearch,
        "area",
        bounds,
        filters,
        limit,
        includeBuildingsWithoutMatchingListings,
      ),
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
    }) => childKey(
        roots.buildingSearch,
        "nearby",
        position,
        radiusMeters,
        filters,
        limit,
        includeBuildingsWithoutMatchingListings,
      ),
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
    }) => childKey(
        roots.buildingSearch,
        "near-lines",
        geometry,
        distanceMeters,
        filters,
        limit,
        includeBuildingsWithoutMatchingListings,
      ),
    listingsInBuilding: roots.listingsInBuilding,
    listingsInBuildingResults: <TFilters>({
      buildingId,
      filters,
      limit,
    }: {
      buildingId: string | undefined
      filters: TFilters
      limit: number
    }) => childKey(roots.listingsInBuilding, buildingId, filters, limit),
  },
  listings: {
    ownerLists: roots.ownerListings,
    ownerList: ({ filter, sort, limit }: OwnerListingKeyInput) =>
      childKey(roots.ownerListings, filter, sort, limit),
    ownerDetails: roots.ownerListingDetails,
    ownerDetail: (listingId: string | undefined) =>
      childKey(roots.ownerListingDetails, listingId),
    publicDetails: roots.publicListingDetails,
    publicListingDetails: (listingId: string | undefined) =>
      childKey(roots.publicListingDetails, listingId),
    publicDetail: (
      listingId: string | undefined,
      viewerKey?: string | null,
    ) => childKey(
      roots.publicListingDetails,
      listingId,
      viewerKey ?? "anonymous",
    ),
  },
  admin: {
    pendingPosts: {
      all: roots.adminPendingPosts,
      lists: roots.adminPendingPosts,
      list: (status: string | undefined) =>
        childKey(roots.adminPendingPosts, status),
    },
    buildingEditRequests: {
      lists: roots.adminBuildingEditRequests,
      list: (status: string | undefined) =>
        childKey(roots.adminBuildingEditRequests, status),
      details: roots.adminBuildingEditRequestDetails,
      detail: (requestId: string | undefined) =>
        childKey(roots.adminBuildingEditRequestDetails, requestId),
    },
    reports: {
      lists: roots.adminReports,
      list: (status: string | undefined) =>
        childKey(roots.adminReports, status),
      details: roots.adminReportDetails,
      detail: (reportId: string | undefined) =>
        childKey(roots.adminReportDetails, reportId),
    },
    reviewReports: {
      lists: roots.adminReviewReports,
      list: (status: string | undefined) =>
        childKey(roots.adminReviewReports, status),
      details: roots.adminReviewReportDetails,
      detail: (reviewReportId: string | undefined) =>
        childKey(roots.adminReviewReportDetails, reviewReportId),
    },
    suspensions: {
      lists: roots.adminSuspensions,
      list: (status: string | undefined) =>
        childKey(roots.adminSuspensions, status),
      details: roots.adminSuspensionDetails,
      detail: (suspensionId: string | undefined) =>
        childKey(roots.adminSuspensionDetails, suspensionId),
    },
    platformAdmins: {
      all: roots.adminPlatformAdmins,
      lists: roots.adminPlatformAdmins,
      list: roots.adminPlatformAdmins,
    },
    users: {
      all: roots.adminUserDetails,
      details: roots.adminUserDetails,
      detail: (userId: string | undefined) =>
        childKey(roots.adminUserDetails, userId),
    },
  },
} as const
