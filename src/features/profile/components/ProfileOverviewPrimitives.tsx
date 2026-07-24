import { BadgeCheck } from "lucide-react"
import type { ReactNode } from "react"

import { Avatar } from "@/shared/components/data-display/Avatar"

type ProfilePhoto = {
  secureUrl?: string | null
  alt?: string | null
}

export function ProfileAvatar({
  displayName,
  photo,
  isActive = false,
  statusLabel = "Active profile",
  size = "large",
}: {
  displayName?: string | null
  photo?: ProfilePhoto | null
  isActive?: boolean
  statusLabel?: string
  size?: "medium" | "large"
}) {
  const normalizedStatusLabel = normalizeText(statusLabel) || "Active profile"

  return (
    <div className="relative shrink-0">
      <Avatar
        displayName={displayName}
        photo={photo}
        size="profile"
        className={
          size === "medium"
            ? "h-32 w-32 text-4xl lg:h-36 lg:w-36"
            : undefined
        }
      />

      {isActive && (
        <span
          className="absolute bottom-2 right-2 h-7 w-7 rounded-full border-4 border-white bg-emerald-500 shadow-sm md:h-6 md:w-6 lg:h-7 lg:w-7"
          aria-label={normalizedStatusLabel}
          title={normalizedStatusLabel}
        />
      )}
    </div>
  )
}

export function ProfileIdentity({
  displayName,
  isVerified = false,
  secondaryText,
}: {
  displayName?: string | null
  isVerified?: boolean
  secondaryText?: string | null
}) {
  const name = normalizeText(displayName) || "Profile"
  const secondary = normalizeText(secondaryText)

  return (
    <div className="flex min-w-0 flex-col items-center gap-2 md:flex-row md:items-end">
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="max-w-full truncate text-3xl font-bold text-slate-950">
          {name}
        </h1>
        {isVerified && (
          <span
            className="inline-flex shrink-0 items-center"
            aria-label="Verified profile"
            title="Verified profile"
          >
            <BadgeCheck
              aria-hidden="true"
              className="h-6 w-6 fill-[#1d9bf0] text-white"
              strokeWidth={3}
            />
          </span>
        )}
      </div>

      {secondary && (
        <>
          <span aria-hidden="true" className="hidden h-6 w-px bg-slate-200 md:block" />
          <p className="max-w-full truncate text-lg text-slate-500">{secondary}</p>
        </>
      )}
    </div>
  )
}

export function ProfileDetails({
  createdAt,
  description,
  languages,
}: {
  createdAt?: string | null
  description?: string | null
  languages?: readonly string[] | null
}) {
  const createdMonth = formatCreatedMonth(createdAt)
  const normalizedDescription = normalizeText(description)
  const normalizedLanguages = normalizeStringList(languages)

  return (
    <div className="space-y-2">
      {(createdMonth || normalizedLanguages.length > 0) && (
        <p className="text-sm font-medium text-slate-500">
          {createdMonth && <span>Since {createdMonth}</span>}
          {createdMonth && normalizedLanguages.length > 0 && (
            <span className="px-1.5 text-slate-300">·</span>
          )}
          {normalizedLanguages.length > 0 && (
            <span>{normalizedLanguages.join(" · ")}</span>
          )}
        </p>
      )}

      {normalizedDescription ? (
        <p className="text-base text-slate-700">{normalizedDescription}</p>
      ) : (
        <p className="text-sm italic text-slate-400">No bio added yet.</p>
      )}
    </div>
  )
}

export type ProfileStatItem = {
  id: string
  label: string
  value: ReactNode
  hidden?: boolean
}

export function ProfileStatList({
  items,
}: {
  items?: readonly ProfileStatItem[] | null
}) {
  const visibleItems = Array.isArray(items)
    ? items.filter((item) => item && !item.hidden)
    : []

  if (visibleItems.length === 0) return null

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 md:justify-start">
      {visibleItems.map((item) => (
        <div key={item.id} className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-slate-950">{item.value}</span>
          <span className="text-sm font-medium text-slate-500">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

function formatCreatedMonth(value?: string | null) {
  const normalizedValue = normalizeText(value)

  if (!normalizedValue) return null

  const date = new Date(normalizedValue)

  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  }).format(date)
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeStringList(values?: readonly string[] | null) {
  if (!Array.isArray(values)) return []

  return [...new Set(values.map(normalizeText).filter(Boolean))]
}
