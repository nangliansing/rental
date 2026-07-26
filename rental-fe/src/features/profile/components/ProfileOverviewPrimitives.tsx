import { BadgeCheck, Pencil } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"
import { Avatar } from "@/shared/components/data-display/Avatar"

import { PROFILE_EDIT_BADGE_CLASS } from "../utils/profileLayoutStyles"

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
  editHref,
  className,
}: {
  displayName?: string | null
  photo?: ProfilePhoto | null
  isActive?: boolean
  statusLabel?: string
  size?: "compact" | "hero" | "medium" | "large"
  editHref?: string
  className?: string
}) {
  const normalizedStatusLabel = normalizeText(statusLabel) || "Active profile"
  const hasEditAction = Boolean(editHref?.trim())
  const dimensionClassName =
    size === "compact"
      ? "h-20 w-20 text-2xl md:h-32 md:w-32 md:text-4xl"
      : size === "hero"
        ? "h-28 w-28 text-3xl sm:h-32 sm:w-32 sm:text-4xl md:h-36 md:w-36 lg:h-40 lg:w-40"
        : size === "medium"
          ? "h-32 w-32 text-4xl lg:h-36 lg:w-36"
          : undefined

  return (
    <div className={cn("relative inline-block shrink-0", className)}>
      <Avatar
        displayName={displayName}
        photo={photo}
        size="profile"
        className={dimensionClassName}
      />

      {isActive && (
        <span
          className={cn(
            "absolute rounded-full border-[3px] border-white bg-emerald-500 shadow-sm",
            hasEditAction
              ? "bottom-2 left-2 h-4 w-4 sm:bottom-2.5 sm:left-2.5"
              : size === "hero"
                ? "bottom-2 right-2 h-4 w-4 sm:bottom-2.5 sm:right-2.5"
                : "bottom-0.5 right-0.5 h-4 w-4 md:bottom-2 md:right-2 md:h-6 md:w-6",
          )}
          aria-label={normalizedStatusLabel}
          title={normalizedStatusLabel}
        />
      )}

      {hasEditAction && (
        <Link
          to={editHref!}
          className={cn(
            PROFILE_EDIT_BADGE_CLASS,
            size === "hero"
              ? "bottom-2 right-2 h-8 w-8 sm:bottom-2.5 sm:right-2.5"
              : "bottom-1.5 right-1.5 h-7 w-7 md:bottom-2 md:right-2 md:h-8 md:w-8",
          )}
          aria-label="Edit profile"
        >
          <Pencil
            className={cn(
              "shrink-0",
              size === "hero" ? "h-3.5 w-3.5" : "h-3 w-3 md:h-3.5 md:w-3.5",
            )}
            aria-hidden="true"
          />
        </Link>
      )}
    </div>
  )
}

export function ProfileIdentity({
  displayName,
  isVerified = false,
  secondaryText,
  inlineMeta,
  align = "start",
}: {
  displayName?: string | null
  isVerified?: boolean
  secondaryText?: string | null
  inlineMeta?: string | null
  align?: "center" | "start"
}) {
  const name = normalizeText(displayName) || "Profile"
  const secondary = normalizeText(secondaryText)
  const meta = normalizeText(inlineMeta)
  const isCentered = align === "center"

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-0.5",
        isCentered ? "items-center text-center" : "items-center md:items-start",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-col gap-0.5",
          isCentered ? "items-center" : "",
          meta && !isCentered ? "md:flex-row md:flex-wrap md:items-center md:gap-x-2" : "",
        )}
      >
        <div
          className={cn(
            "flex min-w-0 max-w-full items-center gap-1.5",
            isCentered ? "justify-center" : "",
          )}
        >
          <h1
            className={cn(
              "max-w-full truncate font-bold text-slate-950",
              isCentered ? "text-xl sm:text-[1.35rem]" : "text-3xl",
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

        {meta && !isCentered && (
          <p className="max-w-full truncate text-sm text-slate-500">{meta}</p>
        )}
      </div>

      {secondary && (
        <p
          className={cn(
            "max-w-full truncate text-sm text-slate-500",
            isCentered ? "text-center" : "text-center md:text-left",
          )}
        >
          {secondary}
        </p>
      )}
    </div>
  )
}

export function formatProfileMetaText({
  createdAt,
  languages,
}: {
  createdAt?: string | null
  languages?: readonly string[] | null
}) {
  const createdMonth = formatCreatedMonth(createdAt)
  const normalizedLanguages = normalizeStringList(languages)

  return [
    createdMonth ? `Since ${createdMonth}` : null,
    normalizedLanguages.length > 0 ? normalizedLanguages.join(" · ") : null,
  ]
    .filter(Boolean)
    .join(" · ")
}

export function ProfileDetails({
  createdAt,
  description,
  languages,
  emptyBioLabel = "No bio added yet.",
  align = "start",
  hideMeta = false,
}: {
  createdAt?: string | null
  description?: string | null
  languages?: readonly string[] | null
  emptyBioLabel?: string | null
  align?: "center" | "start"
  hideMeta?: boolean
}) {
  const normalizedDescription = normalizeText(description)
  const metaText = hideMeta
    ? ""
    : formatProfileMetaText({ createdAt, languages })

  return (
    <div
      className={cn(
        "space-y-1",
        align === "center" ? "text-center" : "text-center md:text-left",
      )}
    >
      {metaText && (
        <p className="text-xs text-slate-500 sm:text-sm">{metaText}</p>
      )}

      {normalizedDescription ? (
        <p className="text-sm leading-6 text-slate-700">
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
  className,
}: {
  items?: readonly ProfileStatItem[] | null
  variant?: "default" | "inline" | "centered"
  className?: string
}) {
  const visibleItems = Array.isArray(items)
    ? items.filter((item) => item && !item.hidden)
    : []

  if (visibleItems.length === 0) return null

  if (variant === "centered" || variant === "inline") {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-center gap-y-1 md:justify-start",
          variant === "centered" ? "gap-x-0 divide-x divide-slate-200" : "gap-x-5",
          className,
        )}
      >
        {visibleItems.map((item) => (
          <p
            key={item.id}
            className={cn(
              "text-sm text-slate-950 sm:text-base",
              variant === "centered" ? "px-4 first:pl-0 last:pr-0 sm:px-5" : "",
            )}
          >
            <span className="font-bold">{item.value}</span>
            <span className="font-normal text-slate-500"> {item.label}</span>
          </p>
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-0 divide-x divide-slate-200 gap-y-1 md:justify-start",
        className,
      )}
    >
      {visibleItems.map((item) => (
        <p
          key={item.id}
          className="px-4 text-sm text-slate-950 first:pl-0 last:pr-0 sm:px-5 sm:text-base"
        >
          <span className="font-bold">{item.value}</span>
          <span className="font-normal text-slate-500"> {item.label}</span>
        </p>
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
