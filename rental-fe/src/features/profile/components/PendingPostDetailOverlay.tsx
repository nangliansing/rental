import {
  Bath,
  Bed,
  ChevronLeft,
  ImageIcon,
  MoreHorizontal,
  Ruler,
  Trash2,
  Users,
  X,
} from "lucide-react"
import type { ComponentType } from "react"
import { useState } from "react"
import { Link } from "react-router-dom"

import { BuildingSummaryCard } from "@/features/buildings/components/BuildingSummaryCard"
import { ListingCoverImage } from "@/features/listing/components/ListingPresentationPrimitives"
import {
  formatBedroom,
  formatCompactMoney,
  formatContract,
  getSortedListingPhotos,
} from "@/features/listing/utils/listingDisplay"
import { getFormErrorMessage } from "@/features/listing/utils/formFieldUtils"
import {
  type PendingPost,
  useDeleteOwnerPendingPost,
} from "@/features/pending-post"
import { cn } from "@/lib/utils"
import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"
import { ModalPortal } from "@/shared/components/ModalPortal"
import { ExpandableFormattedText } from "@/shared/components/data-display/ExpandableFormattedText"
import {
  DROPDOWN_MENU_CONTENT_CLASSNAME,
  DROPDOWN_MENU_ITEM_DANGER_CLASSNAME,
} from "@/shared/components/menus/dropdownMenuStyles"
import { useAccessibleModal } from "@/shared/hooks/useAccessibleModal"

import {
  formatPendingPostSubmittedAt,
  getPendingPostBuildingName,
  getPendingPostStatusStyle,
  getPendingPostSubmissionType,
} from "../utils/pendingPostDisplayUtils"

type PendingPostDetailOverlayProps = {
  post: PendingPost | null
  onDeleted: (post: PendingPost) => void
  onClose: () => void
}

export function PendingPostDetailOverlay({
  post,
  onDeleted,
  onClose,
}: PendingPostDetailOverlayProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const deleteMutation = useDeleteOwnerPendingPost()
  const { containerRef, requestClose } = useAccessibleModal<HTMLElement>({
    isOpen: Boolean(post),
    onClose,
  })

  if (!post) return null

  const listing = post.listing
  const status = getPendingPostStatusStyle(post.status)
  const StatusIcon = status.icon
  const photos = getSortedListingPhotos(listing?.media ?? [])
  const buildingName = getPendingPostBuildingName(post)
  const building = post.existingBuilding ?? post.building

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[1000] flex bg-white sm:items-center sm:justify-center sm:bg-slate-950/35 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pending-post-detail-title"
      >
        <button
          type="button"
          className="absolute inset-0 hidden cursor-default sm:block"
          aria-label="Close pending submission details"
          onClick={requestClose}
        />

        <article
          ref={containerRef}
          tabIndex={-1}
          className="relative flex h-full w-full flex-col overflow-hidden bg-white text-slate-950 sm:max-h-[calc(100vh-3rem)] sm:max-w-3xl sm:rounded-2xl sm:shadow-2xl"
        >
          <header className="flex shrink-0 items-start gap-3 border-b border-slate-100 px-3 py-3 sm:px-5">
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 hover:text-slate-950 sm:hidden"
              aria-label="Back to pending submissions"
              onClick={requestClose}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ring-1",
                    status.className,
                  )}
                >
                  <StatusIcon className="h-3.5 w-3.5" />
                  {status.label}
                </span>
                <span className="truncate text-xs font-semibold text-slate-400">
                  {getPendingPostSubmissionType(post)}
                </span>
              </div>
              <h2
                id="pending-post-detail-title"
                className="mt-2 truncate text-lg font-semibold text-slate-950"
              >
                {buildingName}
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Submitted {formatPendingPostSubmittedAt(post.createdAt)}
              </p>
            </div>

            <button
              type="button"
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-950 sm:flex"
              aria-label="Close pending submission details"
              onClick={requestClose}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative">
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                aria-label="Open submission actions"
                aria-expanded={isActionsMenuOpen}
                onClick={() => setIsActionsMenuOpen((isOpen) => !isOpen)}
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>

              {isActionsMenuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10 cursor-default"
                    aria-label="Close submission actions"
                    onClick={() => setIsActionsMenuOpen(false)}
                  />
                  <div
                    className={cn(
                      "absolute right-0 top-11 z-20",
                      DROPDOWN_MENU_CONTENT_CLASSNAME,
                    )}
                  >
                    <button
                      type="button"
                      className={DROPDOWN_MENU_ITEM_DANGER_CLASSNAME}
                      onClick={() => {
                        setIsActionsMenuOpen(false)
                        setIsConfirmingDelete(true)
                      }}
                    >
                      <Trash2 className="h-5 w-5 shrink-0" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <section className="grid grid-cols-2 gap-1 bg-slate-100 sm:grid-cols-3">
              {photos.length > 0 ? (
                photos.map((photo, index) => (
                  <div
                    key={photo.publicId}
                    className="relative aspect-square overflow-hidden bg-slate-100"
                  >
                    <ListingCoverImage
                      photo={photo}
                      altFallback={`Submission photo ${index + 1}`}
                      fallbackClassName="text-slate-300"
                    />
                    {photo.isCover && (
                      <span className="absolute left-2 top-2 rounded-full bg-slate-950/65 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md">
                        Cover
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-2 flex aspect-video items-center justify-center bg-slate-100 sm:col-span-3">
                  <ImageIcon className="h-10 w-10 text-slate-300" />
                </div>
              )}
            </section>

            {listing && (
              <div className="space-y-6 px-4 py-5 sm:px-5">
                {post.reviewNote && (
                  <section className="rounded-xl bg-slate-50 p-3">
                    <h3 className="text-sm font-semibold text-slate-950">
                      Review note
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {post.reviewNote}
                    </p>
                  </section>
                )}

                <section>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-2xl font-semibold text-slate-950">
                        {formatCompactMoney(listing.rent ?? 0)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Dep {formatCompactMoney(listing.deposit ?? 0)} · Move{" "}
                        {formatCompactMoney(listing.moveInCost ?? 0)}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                      {formatContract(listing.contractMonths ?? 0)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <DetailMetric
                      icon={Bed}
                      label={formatBedroom(listing.bedroomCount ?? 0)}
                    />
                    <DetailMetric
                      icon={Bath}
                      label={
                        listing.bathroomCount === 1
                          ? "1 bath"
                          : `${listing.bathroomCount ?? 0} baths`
                      }
                    />
                    <DetailMetric
                      icon={Users}
                      label={`${listing.occupancy ?? 0} people`}
                    />
                    <DetailMetric
                      icon={Ruler}
                      label={
                        listing.size
                          ? `${listing.size} sqm`
                          : "Size not set"
                      }
                    />
                  </div>

                  <ExpandableFormattedText
                    text={listing.description}
                    className="mt-4"
                    collapsedLines={6}
                  />
                </section>

                {building && (
                  <BuildingSummaryCard
                    building={building}
                    titleLevel={3}
                    hideEmptyRent
                    hideActions
                    className="border-b-0 border-t px-0 pt-5"
                  />
                )}
              </div>
            )}
          </div>

          {(isConfirmingDelete || post.approvedListingId) && (
            <footer className="shrink-0 border-t border-slate-100 bg-white p-4 sm:px-5">
              {isConfirmingDelete ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Delete this submission?
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      It will be removed from your pending list.
                    </p>
                  </div>
                  {deleteError && (
                    <p className="text-xs font-medium text-rose-600">
                      {deleteError}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        setIsConfirmingDelete(false)
                        setDeleteError("")
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="flex h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        setDeleteError("")
                        deleteMutation.mutate(post._id, {
                          onSuccess: (deletedPost) => {
                            onDeleted(deletedPost ?? post)
                          },
                          onError: (error) => {
                            setDeleteError(
                              getFormErrorMessage(
                                error,
                                "Could not delete submission.",
                              ),
                            )
                          },
                        })
                      }}
                    >
                      {deleteMutation.isPending && (
                        <LoaderIcon className="h-4 w-4" />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                post.approvedListingId && (
                  <Link
                    to={`/listings/${post.approvedListingId}`}
                    className="flex h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                    onClick={requestClose}
                  >
                    View listing
                  </Link>
                )
              )}
            </footer>
          )}
        </article>
      </div>
    </ModalPortal>
  )
}

function DetailMetric({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <div className="flex h-10 items-center gap-2 rounded-lg bg-slate-50 px-3 text-sm font-semibold text-slate-700">
      <Icon className="h-4 w-4 text-slate-500" />
      <span className="truncate">{label}</span>
    </div>
  )
}
