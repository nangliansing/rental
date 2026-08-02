import { useCallback, useState } from "react"
import { Link, useLocation, useSearchParams } from "react-router-dom"
import { CheckCircle2, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useReverseGeocode } from "@/features/geocode/api"
import {
  type PendingPost,
  useCreatePendingPost,
} from "@/features/pending-post"
import { useBuildingById } from "@/features/buildings/api"
import { BuildingSummaryCard } from "@/features/buildings/components/BuildingSummaryCard"
import {
  ProfilePageError,
  ProfilePageLoading,
  ProfileSetupRequired,
} from "@/features/profile/components/ProfilePageStates"
import { useMyProfileGate } from "@/features/profile/hooks/useMyProfileGate"
import { useNavigateBack } from "@/shared/hooks/useNavigateBack"
import { LoginRequired } from "@/shared/components/auth/LoginRequired"
import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"
import { useStandalonePageBack } from "@/shared/components/navigation/StandalonePageBackContext"

import {
  BuildingForm,
  type BuildingFormValues,
} from "../components/BuildingForm"
import {
  ListingForm,
  type ListingFormSubmitValues,
  type ListingFormValues,
} from "../components/ListingForm"
import { parseCreateListingLocation } from "../utils/parseCreateListingLocation"

type CreateListingStep = "building" | "listing"

function formatCoordinate(value: number) {
  return value.toFixed(5)
}

export function ListingCreatePage() {
  const location = useLocation()
  const navigateBack = useNavigateBack("/")
  const gate = useMyProfileGate()
  const loginHref = `/login?redirect=${encodeURIComponent(
    `${location.pathname}${location.search}`,
  )}`
  const createPendingPostMutation = useCreatePendingPost()
  const [searchParams] = useSearchParams()
  const buildingId = searchParams.get("buildingId")
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const isExistingBuilding = Boolean(buildingId)
  const hasLocationParams = Boolean(lat?.trim() || lng?.trim())
  const selectedLocation = parseCreateListingLocation(lat, lng)
  const hasInvalidLocationParams =
    hasLocationParams && !isExistingBuilding && !selectedLocation
  const canCreateListing = Boolean(gate.profile)
  const [step, setStep] = useState<CreateListingStep>(
    isExistingBuilding ? "listing" : "building",
  )
  const buildingQuery = useBuildingById({
    buildingId: buildingId ?? undefined,
    enabled: isExistingBuilding && canCreateListing,
  })
  const reverseGeocodeQuery = useReverseGeocode({
    lat: selectedLocation?.coordinates[1] ?? null,
    lng: selectedLocation?.coordinates[0] ?? null,
    enabled:
      canCreateListing &&
      !isExistingBuilding &&
      step === "building" &&
      selectedLocation !== null,
  })

  const [buildingDraft, setBuildingDraft] = useState<BuildingFormValues | null>(
    null,
  );
  const [submittedPendingPost, setSubmittedPendingPost] =
    useState<PendingPost | null>(null);

  const handleBack = useCallback(() => {
    if (!isExistingBuilding && step === "listing") {
      setStep("building")
      return
    }

    navigateBack()
  }, [isExistingBuilding, navigateBack, step])

  useStandalonePageBack(handleBack)

  const handleSubmitListing = async (values: ListingFormSubmitValues) => {
    const listing = values as ListingFormValues;

    const pendingPost = isExistingBuilding
      ? await createPendingPostMutation.mutateAsync({
          existingBuildingId: buildingId as string,
          listing,
        })
      : await createPendingPostMutation.mutateAsync({
          building: {
            ...(buildingDraft as BuildingFormValues),
            location: getRequiredSelectedLocation(selectedLocation),
          },
          listing,
        })

    setSubmittedPendingPost(pendingPost)
  }

  if (submittedPendingPost) {
    return <PendingPostSubmitted pendingPost={submittedPendingPost} />
  }

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-slate-950">
      <div className="mx-auto max-w-2xl">
        {gate.isProfileLoading && (
          <ProfilePageLoading message="Checking your profile..." />
        )}

        {gate.showLogin && (
          <LoginRequired
            title="Log in to list a room"
            description="Sign in and set up your contact profile before submitting a listing."
            loginHref={loginHref}
            secondaryHref="/"
            secondaryLabel="Back to map"
          />
        )}

        {!gate.isAuthLoading && gate.isAuthenticated && gate.isMissing && (
          <ProfileSetupRequired
            title="Create your contact profile first"
            description="You need a contact profile before you can submit a listing for review."
            actionLabel="Set up profile"
            actionHref="/profile"
          />
        )}

        {gate.showProfileError && (
          <ProfilePageError
            message={gate.errorMessage}
            onRetry={() => void gate.profileQuery.refetch()}
          />
        )}

        {canCreateListing && (
          <div className="space-y-6">
        <header>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">
              {isExistingBuilding
                ? "Selected building"
                : `Step ${step === "building" ? "1" : "2"} of 2`}
            </p>
            <h1 className="mt-1 text-2xl font-semibold">
              {step === "building" ? "Building details" : "Room details"}
            </h1>
          </div>
        </header>

        {isExistingBuilding && buildingQuery.isLoading && (
          <section className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-500">
            <LoaderIcon className="h-4 w-4" />
            Loading selected building...
          </section>
        )}

        {isExistingBuilding && buildingQuery.data && (
          <BuildingSummaryCard
            building={buildingQuery.data}
            variant="contained"
            titleLevel={2}
            hideEmptyRent
            hideActions
          />
        )}

        {isExistingBuilding && buildingQuery.isError && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            The selected building details could not be loaded. You can still
            submit the listing, or return to the map and select it again.
          </section>
        )}

        {!isExistingBuilding && step === "building" && (
          <section className="space-y-4">
            {hasInvalidLocationParams && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                The map location in this link is invalid. Return to the map and
                select a location before creating a listing.
              </div>
            )}

            {selectedLocation && (
              <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p>Location selected from the map</p>
                  <p className="mt-0.5 break-words text-xs text-slate-500">
                    Lat {formatCoordinate(selectedLocation.coordinates[1])}, Lng{" "}
                    {formatCoordinate(selectedLocation.coordinates[0])}
                  </p>
                  {reverseGeocodeQuery.isFetching && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      <LoaderIcon className="h-3.5 w-3.5" />
                      Looking up address from map location...
                    </p>
                  )}
                  {reverseGeocodeQuery.isNotFound && (
                    <p className="mt-1 text-xs text-amber-700">
                      No address was found for this location. Enter one manually.
                    </p>
                  )}
                  {reverseGeocodeQuery.isError &&
                    !reverseGeocodeQuery.isNotFound && (
                      <p className="mt-1 text-xs text-amber-700">
                        {reverseGeocodeQuery.error instanceof Error
                          ? reverseGeocodeQuery.error.message
                          : "Address lookup is unavailable. Enter one manually."}
                      </p>
                    )}
                </div>
              </div>
            )}

            <BuildingForm
              submitLabel="Continue to listing"
              submitDisabled={!selectedLocation}
              defaultValues={buildingDraft ?? undefined}
              suggestedAddress={reverseGeocodeQuery.formattedAddress}
              onSubmit={(values) => {
                if (!selectedLocation) return

                const nextBuildingDraft = values as BuildingFormValues

                setBuildingDraft(nextBuildingDraft)
                setStep("listing")
              }}
            />

            {!selectedLocation && !hasInvalidLocationParams && (
              <p className="text-sm text-slate-500">
                Open this page from the map after selecting a location.
              </p>
            )}
          </section>
        )}

        {step === "listing" &&
          (isExistingBuilding || (buildingDraft && selectedLocation)) && (
          <section className="space-y-4">
            {!isExistingBuilding && buildingDraft && (
              <BuildingSummaryCard
                building={{
                  ...buildingDraft,
                  location: selectedLocation,
                }}
                variant="contained"
                titleLevel={2}
                hideEmptyRent
                showCoordinates
                hideActions
                onEditDraft={() => setStep("building")}
              />
            )}

            <ListingForm
              submitLabel="Submit for review"
              onSubmit={handleSubmitListing}
            />
          </section>
        )}
          </div>
        )}
      </div>
    </main>
  );
}

function getRequiredSelectedLocation(
  selectedLocation: ReturnType<typeof parseCreateListingLocation>,
) {
  if (!selectedLocation) {
    throw new Error("Select the building location from the map first")
  }

  return selectedLocation
}

function PendingPostSubmitted({ pendingPost }: { pendingPost: PendingPost }) {
  return (
    <main className="min-h-screen bg-white px-4 py-6 text-slate-950">
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>

        <h1 className="mt-5 text-2xl font-semibold">Submitted for review</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Your room is saved as a pending post. It will appear on the platform
          after review.
        </p>

        <p className="mt-3 break-all text-xs text-slate-400">
          Reference: {pendingPost._id}
        </p>

        <div className="mt-6 grid gap-3">
          <Button asChild className="h-11 rounded-full">
            <Link to="/profile">Go to profile</Link>
          </Button>

          <Button asChild variant="outline" className="h-11 rounded-full">
            <Link to="/">Back to map</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
