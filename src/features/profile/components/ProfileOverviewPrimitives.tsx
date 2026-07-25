import { BadgeCheck } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
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
  size?: "compact" | "medium" | "large"
}) {
  const normalizedStatusLabel = normalizeText(statusLabel) || "Active profile"
  const dimensionClassName =
    size === "compact"
      ? "h-24 w-24 text-3xl md:h-32 md:w-32 md:text-4xl"
      : size === "medium"
        ? "h-32 w-32 text-4xl lg:h-36 lg:w-36"
        : undefined

  return (
    <div className="relative shrink-0">
      <Avatar
        displayName={displayName}
        photo={photo}
        size="profile"
        className={dimensionClassName}
      />

      {isActive && (
        <span
          className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-[3px] border-white bg-emerald-500 shadow-sm md:bottom-2 md:right-2 md:h-6 md:w-6"
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
  align = "start",
}: {
  displayName?: string | null
  isVerified?: boolean
  secondaryText?: string | null
  align?: "center" | "start"
}) {
  const name = normalizeText(displayName) || "Profile"
  const secondary = normalizeText(secondaryText)
  const isCentered = align === "center"

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1",
        isCentered ? "items-center" : "items-center md:items-start",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <h1
          className={cn(
            "max-w-full truncate font-bold text-slate-950",
            isCentered ? "text-xl sm:text-2xl" : "text-3xl",
          )}
        >
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
              className="h-5 w-5 fill-[#1d9bf0] text-white sm:h-6 sm:w-6"
              strokeWidth={3}
            />
          </span>
        )}
      </div>

      {secondary && (
        <p
          className={cn(
            "max-w-full truncate text-sm text-slate-500",
            isCentered ? "text-center md:text-left" : "",
          )}
        >
          {secondary}
        </p>
      )}
    </div>
  )
}

export function ProfileDetails({
  createdAt,
  description,
  languages,
  emptyBioLabel = "No bio added yet.",
  align = "start",
}: {
  createdAt?: string | null
  description?: string | null
  languages?: readonly string[] | null
  emptyBioLabel?: string | null
  align?: "center" | "start"
}) {
  const createdMonth = formatCreatedMonth(createdAt)
  const normalizedDescription = normalizeText(description)
  const normalizedLanguages = normalizeStringList(languages)
  const metaText = [
    createdMonth ? `Since ${createdMonth}` : null,
    normalizedLanguages.length > 0 ? normalizedLanguages.join(" · ") : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div
      className={cn(
        "space-y-1",
        align === "center" ? "text-center md:text-left" : "",
      )}
    >
      {metaText && (
        <p className="text-sm text-slate-500">{metaText}</p>
      )}

      {normalizedDescription ? (
        <p className="text-sm leading-6 text-slate-700 sm:text-base">
          {normalizedDescription}
        </p>
      ) : emptyBioLabel ? (
        <p className="text-sm text-slate-400">{emptyBioLabel}</p>
      ) : null}
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
  variant = "default",
}: {
  items?: readonly ProfileStatItem[] | null
  variant?: "default" | "inline"
}) {
  const visibleItems = Array.isArray(items)
    ? items.filter((item) => item && !item.hidden)
    : []

  if (visibleItems.length === 0) return null

  if (variant === "inline") {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 md:justify-start">
        {visibleItems.map((item) => (
          <p key={item.id} className="text-base text-slate-950">
            <span className="font-semibold">{item.value}</span>
            <span> {item.label}</span>
          </p>
        ))}
      </div>
    )
  }

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
