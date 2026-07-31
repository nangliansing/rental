import { useParams } from "react-router-dom"
import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { BuildingSummaryCard } from "@/features/buildings/components/BuildingSummaryCard"
import { ApiError } from "@/lib/api-client"
import { LoginRequired } from "@/shared/components/auth/LoginRequired"

import {
  useUpdateOwnerListing,
  useOwnerListingById,
} from "../api"
import {
  ListingForm,
  type ListingFormSubmitValues,
} from "../components/ListingForm"
import { mapListingToFormValues } from "../utils/mapListingToFormValues"

function ListingEditLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <LoaderIcon className="mb-3 h-6 w-6 text-slate-400" />
      <p className="text-sm font-medium text-slate-600">Loading listing...</p>
    </div>
  )
}

function ListingEditError({ message }: { message: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col justify-center">
      <h1 className="text-2xl font-semibold">Could not load listing</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>

      <Button
        className="mt-6 h-11 rounded-full"
        onClick={() => window.location.reload()}
      >
        Try again
      </Button>
    </div>
  )
}

export function ListingEditPage() {
  const { listingId } = useParams<{ listingId: string }>()
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const updateListingMutation = useUpdateOwnerListing()
  const listingQuery = useOwnerListingById({
    listingId,
    enabled: !isAuthLoading && isAuthenticated,
  })

  const isUnauthorized =
    listingQuery.error instanceof ApiError && listingQuery.error.status === 401
  const isUnavailable =
    listingQuery.error instanceof ApiError &&
    (listingQuery.error.status === 403 || listingQuery.error.status === 404)

  const listing = listingQuery.data?.listing ?? null

  return (
    <main className="min-h-screen bg-white px-4 pb-10 pt-6 text-slate-950">
      <div className="mx-auto max-w-2xl">
        {isAuthLoading && <ListingEditLoading />}

        {!isAuthLoading && !isAuthenticated && (
          <LoginRequired
            description="Log in to edit your listing."
            loginHref={
              listingId
                ? `/login?redirect=/listings/${listingId}/edit`
                : "/login?redirect=/profile"
            }
            secondaryHref="/profile"
            secondaryLabel="Back to profile"
          />
        )}

        {!isAuthLoading && isAuthenticated && listingQuery.isLoading && (
          <ListingEditLoading />
        )}

        {!isAuthLoading && isAuthenticated && listingQuery.isError && (
          <ListingEditError
            message={
              isUnauthorized
                ? "Please log in again to edit this listing."
                : isUnavailable
                  ? "We could not find this listing, or you do not have permission to edit it."
                  : listingQuery.error instanceof Error
                    ? listingQuery.error.message
                    : "Could not load this listing."
            }
          />
        )}

        {!isAuthLoading && isAuthenticated && listing && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold">Edit listing</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Update the room details renters see.
              </p>
            </div>

            {listing.building ? (
              <BuildingSummaryCard
                building={listing.building}
                variant="contained"
                titleLevel={2}
                hideEmptyRent
                showCoordinates
                hideActions
              />
            ) : (
              <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Building data is not available for this listing.
              </section>
            )}

            <ListingForm
              key={listing._id}
              mode="edit"
              defaultValues={mapListingToFormValues(listing)}
              onSubmit={async (values: ListingFormSubmitValues) => {
                await updateListingMutation.mutateAsync({
                  listingId: listing._id,
                  values,
                })
              }}
            />
          </div>
        )}
      </div>
    </main>
  )
}
