import type {
  BuildingFollowerUser,
  SearchBuildingFollower,
} from "../api/buildingFollowParsers"

export const BUILDING_FOLLOWERS_PREVIEW_AVATAR_LIMIT = 3
export const BUILDING_FOLLOWERS_PREVIEW_FETCH_LIMIT = 3

export function normalizeBuildingFollowersBuildingId(
  buildingId?: string | null,
) {
  return buildingId?.trim() ?? ""
}

export type BuildingFollowersSocialProofParts =
  | {
      kind: "empty"
      text: string
    }
  | {
      kind: "followers"
      primaryName: string | null
      suffix: string | null
      fullText: string | null
      isVerified: boolean
    }

export function getBuildingFollowersSocialProofParts(
  followers: readonly SearchBuildingFollower[],
  total: number | null | undefined,
): BuildingFollowersSocialProofParts {
  const safeTotal = normalizeFollowerTotal(total)

  if (safeTotal === 0) {
    return {
      kind: "empty",
      text: formatBuildingFollowersEmptyPreview(),
    }
  }

  const copy = formatBuildingFollowersSocialProof(followers, safeTotal)
  const primaryFollower = followers[0]
  const primaryName = primaryFollower
    ? getBuildingFollowerDisplayName(
        primaryFollower.user,
        primaryFollower.userId,
      )
    : null
  const isVerified = Boolean(primaryFollower?.user?.isVerified)

  if (primaryName && copy.startsWith(primaryName)) {
    return {
      kind: "followers",
      primaryName,
      suffix: copy.slice(primaryName.length),
      fullText: null,
      isVerified,
    }
  }

  return {
    kind: "followers",
    primaryName: null,
    suffix: null,
    fullText: copy,
    isVerified: false,
  }
}

export function formatBuildingFollowersModalAriaLabel(
  buildingName: string | null | undefined,
) {
  const name = buildingName?.trim() || "this building"
  return `Followers of ${name}`
}

export function getBuildingFollowersModalTitle(
  buildingName: string | null | undefined,
) {
  return buildingName?.trim() || "Building"
}

export function getBuildingFollowerListKey(follower: SearchBuildingFollower) {
  return follower._id || `${follower.buildingId}:${follower.userId}`
}

export function getBuildingFollowerDisplayName(
  user: BuildingFollowerUser | null | undefined,
  fallbackUserId?: string,
) {
  const displayName = user?.displayName?.trim()
  if (displayName) return displayName

  const name = user?.name?.trim()
  if (name) return name

  const userId = user?._id?.trim() || fallbackUserId?.trim()
  if (userId) return `User ${userId.slice(-6)}`

  return "Unavailable follower"
}

export function formatBuildingFollowedSince(value: string | null | undefined) {
  if (!value) return "Followed recently"

  const followedAt = new Date(value)
  if (Number.isNaN(followedAt.getTime())) return "Followed recently"

  return `Followed ${new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(followedAt)}`
}

export function normalizeFollowerTotal(total: number | null | undefined) {
  if (typeof total !== "number" || !Number.isFinite(total) || total < 0) {
    return 0
  }

  return Math.floor(total)
}

export function formatBuildingFollowerCount(total: number | null | undefined) {
  const safeTotal = normalizeFollowerTotal(total)

  return `${safeTotal.toLocaleString()} ${safeTotal === 1 ? "follower" : "followers"}`
}

export function formatBuildingFollowersSocialProof(
  followers: readonly SearchBuildingFollower[],
  total: number | null | undefined,
) {
  const safeTotal = normalizeFollowerTotal(total)
  if (safeTotal === 0) return ""

  const names = followers
    .map((follower) =>
      getBuildingFollowerDisplayName(follower.user, follower.userId),
    )
    .filter((name) => name.length > 0)

  if (safeTotal === 1) {
    return `${names[0] ?? "Someone"} follows this building`
  }

  const primary = names[0] ?? "Someone"
  const others = safeTotal - 1

  return `${primary} and ${others.toLocaleString()} ${others === 1 ? "other" : "others"} follow this building`
}

export function formatBuildingFollowersEmptyPreview() {
  return "No one follows this building yet"
}

export function formatBuildingFollowersPreviewAriaLabel(
  buildingName: string | null | undefined,
  total: number | null | undefined,
) {
  const safeTotal = normalizeFollowerTotal(total)
  const name = buildingName?.trim() || "this building"

  if (safeTotal === 0) return `View followers of ${name}`
  if (safeTotal === 1) return `View 1 follower of ${name}`

  return `View all ${safeTotal.toLocaleString()} followers of ${name}`
}
