import { Check, Link2 } from "lucide-react"
import { useState, type MouseEvent } from "react"

import { cn } from "@/lib/utils"
import { useCopyFeedback } from "@/shared/hooks/useCopyFeedback"

import { buildListingUrl } from "../utils/listingDisplay"

const COPY_FEEDBACK_ID = "listing-link"

type CopyListingLinkButtonProps = {
  listingId: unknown
  className?: string
}

function resolveListingShareUrl(listingId: unknown): string | null {
  if (typeof listingId !== "string") return null
  const normalizedId = listingId.trim()
  if (!normalizedId) return null

  return buildListingUrl(normalizedId) ?? null
}

/**
 * Overlay control that copies the public listing detail URL.
 * Always stopPropagation so parent card activators do not fire.
 */
export function CopyListingLinkButton({
  listingId,
  className,
}: CopyListingLinkButtonProps) {
  const { copy, isCopied } = useCopyFeedback()
  const [hasFailed, setHasFailed] = useState(false)
  const url = resolveListingShareUrl(listingId)
  const copied = isCopied(COPY_FEEDBACK_ID)

  if (!url) return null

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setHasFailed(false)

    try {
      await copy(COPY_FEEDBACK_ID, url)
    } catch {
      setHasFailed(true)
    }
  }

  const label = copied
    ? "Link copied"
    : hasFailed
      ? "Could not copy link"
      : "Copy listing link"

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
        "border border-white/35 bg-slate-950/60 text-white shadow-sm backdrop-blur-[2px]",
        "transition duration-200 hover:bg-slate-950/75 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        className,
      )}
      onClick={handleClick}
    >
      {copied ? (
        <Check
          aria-hidden="true"
          className="copy-link-pop h-3.5 w-3.5 text-emerald-300"
          strokeWidth={2.5}
        />
      ) : (
        <Link2 aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.25} />
      )}
    </button>
  )
}
