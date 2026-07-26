export function normalizeProfileDisplayName(
  value: unknown,
  fallback = "Profile",
) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback
}

export function buildProfileShareMessage(profileUrl: string) {
  const normalizedUrl = profileUrl.trim()
  return normalizedUrl
    ? `Hi, I found your rental profile: ${normalizedUrl}`
    : "Hi, I found your rental profile."
}

export function normalizeProfileId(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : ""
}
