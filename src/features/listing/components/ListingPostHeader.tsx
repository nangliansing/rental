import {
  BadgeCheck,
  Copy,
  Flag,
  Languages,
  Lock,
  MessageSquareText,
  MoreHorizontal,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"

import type { SearchListing } from "@/features/map-search/types"
import { Avatar } from "@/shared/components/data-display/Avatar"

import { formatUpdatedAt } from "../utils/listingDisplay"

type ListingPostHeaderProps = {
  agent: SearchListing["agentProfile"]
  updatedAt: string
  isPrivate: boolean
  isOwnListing: boolean
  canCreateListing: boolean
  canReportListing: boolean
  listingUrl?: string
  profileHref?: string
  editHref: string
  listInBuildingHref?: string
  onReviewsRequest?: () => void
  onPrivacyRequest?: () => void
  onDeleteRequest: () => void
  onReportRequest: () => void
}

const COPY_FEEDBACK_DURATION_MS = 1600

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeLanguages(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.flatMap((language) => {
    const normalizedLanguage = normalizeText(language)
    return normalizedLanguage ? [normalizedLanguage] : []
  })
}

async function copyListingLink(listingUrl: string | undefined) {
  const normalizedUrl = normalizeText(listingUrl)
  if (
    !normalizedUrl ||
    typeof navigator === "undefined" ||
    typeof navigator.clipboard?.writeText !== "function"
  ) {
    throw new Error("Clipboard is unavailable")
  }

  await navigator.clipboard.writeText(normalizedUrl)
}

function InlineDot() {
  return <span className="text-slate-300">·</span>
}

function ListerIdentity({
  agent,
  profileHref,
  updatedAt,
}: Pick<ListingPostHeaderProps, "agent" | "profileHref" | "updatedAt">) {
  const displayName = normalizeText(agent?.displayName) || "Lister"
  const languages = normalizeLanguages(agent?.supportLanguages)
  const avatar = (
    <Avatar
      displayName={displayName}
      photo={agent?.profilePhoto}
      colorKey={agent?._id}
      size="sm"
    />
  )
  const name = (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="truncate text-sm font-semibold text-slate-950">
        {displayName}
      </span>

      {agent?.isVerified && (
        <BadgeCheck
          className="h-4 w-4 shrink-0 fill-[#1d9bf0] text-white"
          strokeWidth={3}
          aria-label="Verified lister"
        />
      )}
    </span>
  )

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      {profileHref ? (
        <Link
          to={profileHref}
          className="-m-1 shrink-0 rounded-full p-1 hover:bg-slate-50"
          aria-label={`Open ${displayName} profile`}
        >
          {avatar}
        </Link>
      ) : (
        avatar
      )}

      <div className="min-w-0 flex-1">
        {profileHref ? (
          <Link
            to={profileHref}
            className="-m-1 inline-flex max-w-full rounded-md p-1 hover:bg-slate-50"
          >
            {name}
          </Link>
        ) : (
          name
        )}

        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
          {languages.length > 0 && (
            <>
              <span className="inline-flex min-w-0 items-center gap-1">
                <Languages className="h-3 w-3 shrink-0" />
                <span className="truncate">{languages.join(" · ")}</span>
              </span>
              <InlineDot />
            </>
          )}

          <span className="shrink-0">{formatUpdatedAt(updatedAt)}</span>
        </div>
      </div>
    </div>
  )
}

function ListingActionsMenu({
  isOwnListing,
  canCreateListing,
  canReportListing,
  listingUrl,
  editHref,
  listInBuildingHref,
  onReviewsRequest,
  onPrivacyRequest,
  onDeleteRequest,
  onReportRequest,
}: Omit<ListingPostHeaderProps, "agent" | "updatedAt" | "isPrivate" | "profileHref">) {
  const menuRef = useRef<HTMLDetailsElement | null>(null)
  const feedbackTimerRef = useRef<number | null>(null)
  const [copyLabel, setCopyLabel] = useState("Copy this link")
  const showListInBuilding = canCreateListing && Boolean(listInBuildingHref)

  const closeMenu = () => {
    if (menuRef.current) menuRef.current.open = false
  }

  const scheduleCopyLabelReset = () => {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current)
    }

    feedbackTimerRef.current = window.setTimeout(() => {
      setCopyLabel("Copy this link")
      feedbackTimerRef.current = null
    }, COPY_FEEDBACK_DURATION_MS)
  }

  const handleCopy = async () => {
    try {
      await copyListingLink(listingUrl)
      setCopyLabel("Link copied")
    } catch {
      setCopyLabel("Could not copy")
    } finally {
      scheduleCopyLabelReset()
      closeMenu()
    }
  }

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current)
      }
    }
  }, [])

  return (
    <details ref={menuRef} className="relative shrink-0">
      <summary
        className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-950 [&::-webkit-details-marker]:hidden"
        aria-label="Listing options"
      >
        <MoreHorizontal className="h-5 w-5" />
      </summary>

      <div className="absolute right-0 top-10 z-20 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-sm font-medium text-slate-700 shadow-lg">
        <button
          type="button"
          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
          onClick={handleCopy}
        >
          <Copy className="h-4 w-4" />
          {copyLabel}
        </button>

        {showListInBuilding && listInBuildingHref && (
          <Link
            to={listInBuildingHref}
            className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50"
            onClick={closeMenu}
          >
            <Plus className="h-4 w-4" />
            List in this building
          </Link>
        )}

        {onReviewsRequest && (
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
            onClick={() => {
              closeMenu()
              onReviewsRequest()
            }}
          >
            <MessageSquareText className="h-4 w-4" />
            View lister reviews
          </button>
        )}

        {canReportListing && (
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
            onClick={() => {
              closeMenu()
              onReportRequest()
            }}
          >
            <Flag className="h-4 w-4" />
            Report listing
          </button>
        )}

        {isOwnListing && (
          <>
            {onPrivacyRequest && (
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                onClick={() => {
                  closeMenu()
                  onPrivacyRequest()
                }}
              >
                <ShieldCheck className="h-4 w-4" />
                Edit privacy
              </button>
            )}

            <Link
              to={editHref}
              className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50"
              onClick={closeMenu}
            >
              <Pencil className="h-4 w-4" />
              Edit the listing
            </Link>

            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-rose-600 hover:bg-rose-50"
              onClick={() => {
                closeMenu()
                onDeleteRequest()
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete listing
            </button>
          </>
        )}
      </div>
    </details>
  )
}

export function ListingPostHeader(props: ListingPostHeaderProps) {
  return (
    <header className="flex items-center gap-2.5 px-3 py-2.5">
      <ListerIdentity
        agent={props.agent}
        profileHref={props.profileHref}
        updatedAt={props.updatedAt}
      />

      <div className="flex shrink-0 items-center gap-1.5">
        {props.isPrivate && (
          <span className="inline-flex h-7 items-center gap-1 rounded-full bg-slate-100 px-2 text-xs font-semibold text-slate-600">
            <Lock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Private</span>
          </span>
        )}

        <ListingActionsMenu
          isOwnListing={props.isOwnListing}
          canCreateListing={props.canCreateListing}
          canReportListing={props.canReportListing}
          listingUrl={props.listingUrl}
          editHref={props.editHref}
          listInBuildingHref={props.listInBuildingHref}
          onReviewsRequest={props.onReviewsRequest}
          onPrivacyRequest={props.onPrivacyRequest}
          onDeleteRequest={props.onDeleteRequest}
          onReportRequest={props.onReportRequest}
        />
      </div>
    </header>
  )
}
