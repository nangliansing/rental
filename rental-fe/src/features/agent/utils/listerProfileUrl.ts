export function getListerProfileUrl(profileId: string) {
  if (typeof window === "undefined") return `/listers/${profileId}`

  return `${window.location.origin}/listers/${profileId}`
}
