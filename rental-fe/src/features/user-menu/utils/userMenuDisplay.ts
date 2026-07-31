import type { AuthUser } from "@/features/auth/types"

export function normalizeUserMenuUserId(userId: unknown): string {
  if (typeof userId !== "string") return ""

  return userId.trim()
}

export function getUserMenuDisplayName(name: unknown): string {
  if (typeof name !== "string") return "Account"

  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed : "Account"
}

export function getUserMenuEmail(email: unknown): string | null {
  if (typeof email !== "string") return null

  const trimmed = email.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function isUserMenuAuthUser(user: unknown): user is AuthUser {
  if (!user || typeof user !== "object") return false

  const candidate = user as Partial<AuthUser>
  return (
    typeof candidate._id === "string" &&
    candidate._id.trim().length > 0 &&
    typeof candidate.name === "string" &&
    typeof candidate.email === "string"
  )
}
