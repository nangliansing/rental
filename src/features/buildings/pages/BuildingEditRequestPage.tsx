import { useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { CheckCircle2, Loader2, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { useCreateBuildingEditRequest } from "@/features/building-edit-request/api"
import { ApiError } from "@/lib/api-client"
import { LoginRequired } from "@/shared/components/auth/LoginRequired"
import { useNavigateBack } from "@/shared/hooks/useNavigateBack"

import { useBuildingById, type BuildingDetails } from "../api"
import {
  BuildingForm,
  type BuildingFormSubmitValues,
  type BuildingFormValues,
} from "@/features/listing/components/BuildingForm"
import { cn } from "@/lib/utils"

function mapBuildingToFormValues(building: BuildingDetails): BuildingFormValues {
  return {
    name: building.name,
    buildingType: building.buildingType,
    facilities: building.facilities,
    security: building.security,
    address: building.address ?? "",
  }
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim()
}

function sortStrings(values: string[]) {
  return [...values].sort((firstValue, secondValue) =>
    firstValue.localeCompare(secondValue),
  )
}

function normalizeBuildingValues(values: BuildingFormValues) {
  return {
    name: normalizeText(values.name),
    buildingType: normalizeText(values.buildingType),
    facilities: sortStrings(values.facilities),
    security: sortStrings(values.security),
    address: normalizeText(values.address),
  }
}

function hasBuildingChanges(
  originalValues: BuildingFormValues,
  proposedValues: BuildingFormValues,
) {
  return (
    JSON.stringify(normalizeBuildingValues(originalValues)) !==
    JSON.stringify(normalizeBuildingValues(proposedValues))
  )
}

function formatCoordinate(value: number) {
  return value.toFixed(5)
}

function BuildingEditLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <Loader2 className="mb-3 h-6 w-6 animate-spin text-slate-400" />
      <p className="text-sm font-medium text-slate-600">Loading building...</p>
    </div>
  )
}

function BuildingEditError({ message }: { message: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col justify-center">
      <h1 className="text-2xl font-semibold">Could not load building</h1>
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

function SubmittedState({
  requestId,
  onBack,
}: {
  requestId: string
  onBack: () => void
}) {
  return (
    <main className="min-h-screen bg-white px-4 py-6 text-slate-950">
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>

        <h1 className="mt-5 text-2xl font-semibold">Edit request submitted</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Your building update was sent for review. We will keep the current
          building details until it is approved.
        </p>

        <p className="mt-3 break-all text-xs text-slate-400">
          Reference: {requestId}
        </p>

        <div className="mt-6 grid gap-3">
          <Button className="h-11 rounded-full" onClick={onBack}>
            Back
          </Button>

          <Button asChild variant="outline" className="h-11 rounded-full">
            <Link to="/">Go to map</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}

export function BuildingEditRequestPage() {
  const createBuildingEditRequestMutation = useCreateBuildingEditRequest()
  const { buildingId } = useParams<{ buildingId: string }>()
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const [requestReason, setRequestReason] = useState("")
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(
    null,
  )

  const buildingQuery = useBuildingById({
    buildingId,
    enabled: !isAuthLoading && isAuthenticated,
  })

  const building = buildingQuery.data ?? null
  const defaultValues = useMemo(() => {
    return building ? mapBuildingToFormValues(building) : null
  }, [building])

  const navigateBack = useNavigateBack("/")

  const handleBack = () => {
    navigateBack()
  }

  if (submittedRequestId) {
    return <SubmittedState requestId={submittedRequestId} onBack={handleBack} />
  }

  const isUnavailable =
    buildingQuery.error instanceof ApiError &&
    (buildingQuery.error.status === 403 || buildingQuery.error.status === 404)

  return (
    <main className="min-h-screen bg-white px-4 pb-10 pt-6 text-slate-950">
      <div className="mx-auto max-w-2xl">
        {isAuthLoading && <BuildingEditLoading />}

        {!isAuthLoading && !isAuthenticated && (
          <LoginRequired
            description="Log in with an agent profile to request building edits."
            loginHref={
              buildingId
                ? `/login?redirect=/buildings/${buildingId}/edit`
                : "/login?redirect=/"
            }
            secondaryHref="/"
            secondaryLabel="Back to map"
          />
        )}

        {!isAuthLoading && isAuthenticated && buildingQuery.isLoading && (
          <BuildingEditLoading />
        )}

        {!isAuthLoading && isAuthenticated && buildingQuery.isError && (
          <BuildingEditError
            message={
              isUnavailable
                ? "We could not find this building, or it is no longer available."
                : buildingQuery.error instanceof Error
                  ? buildingQuery.error.message
                  : "Could not load this building."
            }
          />
        )}

        {!isAuthLoading &&
          isAuthenticated &&
          building &&
          defaultValues && (
            <div className="space-y-6">
              <header>
                <p className="text-sm font-medium text-slate-500">
                  Request building edit
                </p>
                <h1 className="mt-1 text-2xl font-semibold">
                  Update {building.name}
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Submit corrected building details for review. Approved
                  changes will update the building for everyone.
                </p>
              </header>

              <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-950">
                  Current location
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPin className="h-4 w-4" />
                  Lat {formatCoordinate(building.location.coordinates[1])}, Lng{" "}
                  {formatCoordinate(building.location.coordinates[0])}
                </p>
              </section>

              <div className="space-y-2">
                <label
                  htmlFor="building-edit-request-reason"
                  className="text-sm font-medium text-slate-950"
                >
                  Reason for request
                </label>
                <textarea
                  id="building-edit-request-reason"
                  value={requestReason}
                  placeholder="Optional note for the reviewer"
                  className={cn(
                    "min-h-24 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground",
                    "placeholder:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                  onChange={(event) => setRequestReason(event.target.value)}
                />
              </div>

              <BuildingForm
                key={`${building._id}-${building.updatedAt}`}
                defaultValues={defaultValues}
                helperText="Your request will be reviewed before the building details are updated."
                submitLabel="Submit edit request"
                onSubmit={async (values: BuildingFormSubmitValues) => {
                  const proposedValues = values as BuildingFormValues

                  if (!hasBuildingChanges(defaultValues, proposedValues)) {
                    throw new Error("Change at least one building detail first")
                  }

                  const request =
                    await createBuildingEditRequestMutation.mutateAsync({
                    buildingId: building._id,
                    proposedBuilding: {
                      ...normalizeBuildingValues(proposedValues),
                      location: building.location,
                    },
                    requestReason: normalizeText(requestReason),
                    })

                  setSubmittedRequestId(request._id)
                }}
              />
            </div>
          )}
      </div>
    </main>
  )
}
