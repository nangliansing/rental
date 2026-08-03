import { useId, useMemo, useState } from "react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { BooleanOptionSelector } from "@/shared/components/inputs/BooleanOptionSelector"
import { MultiOptionSelector } from "@/shared/components/inputs/MultiOptionSelector"
import { SingleOptionSelector } from "@/shared/components/inputs/SingleOptionSelector"
import { getHorizontalScrollRowClass } from "@/shared/components/layout/horizontalScrollRow"
import {
  KITCHEN_TYPE_OPTIONS,
  LISTING_FACILITY_OPTIONS,
  OCCUPANCY_OPTIONS,
} from "@/shared/options/rental-options"

import type { UploadedMedia } from "../../uploads/api/uploadToCloudinary"
import { MediaUploader } from "../../uploads/components/MediaUploader"
import type { MediaUploaderState } from "../../uploads/components/MediaUploader"
import type { ListingVisibility } from "../types"
import {
  areAvailableAtValuesEqual,
  isListingAvailabilityFormValid,
  serializeListingAvailabilityForApi,
  type ListingAvailabilityMode,
} from "../utils/listingAvailability"
import { ListingAvailabilityField } from "./ListingAvailabilityField"
import { ListingContractField } from "./ListingContractField"
import { ListingVisibilityField } from "./ListingVisibilityField"
import {
  areStringArraysEqual,
  getFormErrorMessage,
  normalizeFormText,
  parseOptionalFormNumber,
  parseRequiredFormNumber,
  sortFormStrings,
  stringifyFormNumber,
} from "../utils/formFieldUtils"

export type { ListingVisibility } from "../types"

export type ListingFormValues = {
  visibility: ListingVisibility
  isForeignerAccepted: boolean
  isTM30Provided: boolean
  rent: number
  deposit: number
  moveInCost: number
  electricRate: number | null
  waterRate: number | null
  bedroomCount: number
  bathroomCount: number
  kitchenType: string
  size: number | null
  contractMonths: number
  occupancy: number
  isCookingAllowed: boolean
  isPetAllowed: boolean
  facilities: string[]
  media: UploadedMedia[]
  description: string
  privateNote: string
  availabilityMode: ListingAvailabilityMode
  availableFromDate: string
}

const PRIVATE_NOTE_MAX_LENGTH = 3000

export type ListingFormMode = "create" | "edit"

type ListingFormAvailabilityPatch = {
  availableAt?: string | null
}

export type ListingFormSubmitValues =
  | ListingFormValues
  | (Partial<
      Omit<ListingFormValues, "availabilityMode" | "availableFromDate">
    > &
      ListingFormAvailabilityPatch)

type ListingFormState = Omit<
  ListingFormValues,
  | "rent"
  | "deposit"
  | "moveInCost"
  | "electricRate"
  | "waterRate"
  | "bedroomCount"
  | "bathroomCount"
  | "size"
  | "contractMonths"
  | "occupancy"
> & {
  rent: string
  deposit: string
  moveInCost: string
  electricRate: string
  waterRate: string
  bedroomCount: string
  bathroomCount: string
  size: string
  contractMonths: string
  occupancy: string
  availableFromDate: string
}

const initialValues: ListingFormValues = {
  visibility: "PUBLIC",
  isForeignerAccepted: false,
  isTM30Provided: false,
  rent: 0,
  deposit: 0,
  moveInCost: 0,
  electricRate: null,
  waterRate: null,
  bedroomCount: 0,
  bathroomCount: 1,
  kitchenType: "No Kitchen",
  size: null,
  contractMonths: 3,
  occupancy: 1,
  isCookingAllowed: false,
  isPetAllowed: false,
  facilities: [],
  media: [],
  description: "",
  privateNote: "",
  availabilityMode: "now",
  availableFromDate: "",
}

const BEDROOM_OPTIONS = [
  { label: "Studio", value: 0 },
  { label: "1 bedroom", value: 1 },
  { label: "2 bedrooms", value: 2 },
  { label: "3 bedrooms", value: 3 },
  { label: "4 bedrooms", value: 4 },
]

const BATHROOM_OPTIONS = [
  { label: "1 bathroom", value: 1 },
  { label: "2 bathrooms", value: 2 },
  { label: "3 bathrooms", value: 3 },
  { label: "4 bathrooms", value: 4 },
]

type ListingFormProps = {
  mode?: ListingFormMode
  defaultValues?: Partial<ListingFormValues>
  submitLabel?: string
  onSubmit?: (values: ListingFormSubmitValues) => void | Promise<void>
}

function buildFormValues(
  values?: Partial<ListingFormValues>,
): ListingFormValues {
  return {
    ...initialValues,
    ...values,
    visibility: values?.visibility ?? initialValues.visibility,
    isForeignerAccepted:
      values?.isForeignerAccepted ?? initialValues.isForeignerAccepted,
    isTM30Provided: values?.isTM30Provided ?? initialValues.isTM30Provided,
    rent: values?.rent ?? initialValues.rent,
    deposit: values?.deposit ?? initialValues.deposit,
    moveInCost: values?.moveInCost ?? initialValues.moveInCost,
    electricRate: values?.electricRate ?? initialValues.electricRate,
    waterRate: values?.waterRate ?? initialValues.waterRate,
    bedroomCount: values?.bedroomCount ?? initialValues.bedroomCount,
    bathroomCount: values?.bathroomCount ?? initialValues.bathroomCount,
    kitchenType: values?.kitchenType ?? initialValues.kitchenType,
    size: values?.size ?? initialValues.size,
    contractMonths: values?.contractMonths ?? initialValues.contractMonths,
    occupancy: values?.occupancy ?? initialValues.occupancy,
    isCookingAllowed:
      values?.isCookingAllowed ?? initialValues.isCookingAllowed,
    isPetAllowed: values?.isPetAllowed ?? initialValues.isPetAllowed,
    facilities: Array.isArray(values?.facilities) ? values.facilities : [],
    media: Array.isArray(values?.media) ? values.media : [],
    description: values?.description ?? "",
    privateNote: values?.privateNote ?? "",
    availabilityMode: values?.availabilityMode ?? initialValues.availabilityMode,
    availableFromDate:
      values?.availableFromDate ?? initialValues.availableFromDate,
  }
}

function buildFormState(values: ListingFormValues): ListingFormState {
  return {
    ...values,
    rent: stringifyFormNumber(values.rent),
    deposit: stringifyFormNumber(values.deposit),
    moveInCost: stringifyFormNumber(values.moveInCost),
    electricRate: stringifyFormNumber(values.electricRate),
    waterRate: stringifyFormNumber(values.waterRate),
    bedroomCount: stringifyFormNumber(values.bedroomCount),
    bathroomCount: stringifyFormNumber(values.bathroomCount),
    size: stringifyFormNumber(values.size),
    contractMonths: stringifyFormNumber(values.contractMonths),
    occupancy: stringifyFormNumber(values.occupancy),
    availableFromDate: values.availableFromDate,
  }
}

function normalizeListingValues(values: ListingFormState): ListingFormValues {
  return {
    visibility: values.visibility,
    isForeignerAccepted: values.isForeignerAccepted,
    isTM30Provided: values.isTM30Provided,
    rent: parseRequiredFormNumber(values.rent),
    deposit: parseRequiredFormNumber(values.deposit),
    moveInCost: parseRequiredFormNumber(values.moveInCost),
    electricRate: parseOptionalFormNumber(values.electricRate),
    waterRate: parseOptionalFormNumber(values.waterRate),
    bedroomCount: parseRequiredFormNumber(values.bedroomCount),
    bathroomCount: parseRequiredFormNumber(values.bathroomCount),
    kitchenType: normalizeFormText(values.kitchenType),
    size: parseOptionalFormNumber(values.size),
    contractMonths: parseRequiredFormNumber(values.contractMonths),
    occupancy: parseRequiredFormNumber(values.occupancy),
    isCookingAllowed: values.isCookingAllowed,
    isPetAllowed: values.isPetAllowed,
    facilities: sortFormStrings(values.facilities),
    media: values.media,
    description: normalizeFormText(values.description),
    privateNote: normalizeFormText(values.privateNote),
    availabilityMode: values.availabilityMode,
    availableFromDate: normalizeFormText(values.availableFromDate),
  }
}

function isIntegerInRange(value: number, min: number, max: number) {
  return Number.isInteger(value) && value >= min && value <= max
}

function isNumberInRange(value: number, min: number, max: number) {
  return Number.isFinite(value) && value >= min && value <= max
}

function isNullableNumberInRange(
  value: number | null,
  min: number,
  max: number,
) {
  return value === null || isNumberInRange(value, min, max)
}

function areMediaArraysEqual(
  firstValues: UploadedMedia[],
  secondValues: UploadedMedia[],
) {
  if (firstValues.length !== secondValues.length) return false

  return firstValues.every((media, index) => {
    const nextMedia = secondValues[index]

    return (
      media.publicId === nextMedia?.publicId &&
      media.position === nextMedia.position &&
      media.isCover === nextMedia.isCover
    )
  })
}

function buildChangedListingValues(
  initialValues: ListingFormValues,
  currentValues: ListingFormValues,
): Partial<Omit<ListingFormValues, "availabilityMode" | "availableFromDate">> &
  ListingFormAvailabilityPatch {
  const changes: Partial<
    Omit<ListingFormValues, "availabilityMode" | "availableFromDate">
  > &
    ListingFormAvailabilityPatch = {}

  if (initialValues.visibility !== currentValues.visibility) {
    changes.visibility = currentValues.visibility
  }

  if (initialValues.isForeignerAccepted !== currentValues.isForeignerAccepted) {
    changes.isForeignerAccepted = currentValues.isForeignerAccepted
  }

  if (initialValues.isTM30Provided !== currentValues.isTM30Provided) {
    changes.isTM30Provided = currentValues.isTM30Provided
  }

  if (initialValues.rent !== currentValues.rent)
    changes.rent = currentValues.rent
  if (initialValues.deposit !== currentValues.deposit) {
    changes.deposit = currentValues.deposit
  }
  if (initialValues.moveInCost !== currentValues.moveInCost) {
    changes.moveInCost = currentValues.moveInCost
  }
  if (initialValues.electricRate !== currentValues.electricRate) {
    changes.electricRate = currentValues.electricRate
  }
  if (initialValues.waterRate !== currentValues.waterRate) {
    changes.waterRate = currentValues.waterRate
  }
  if (initialValues.bedroomCount !== currentValues.bedroomCount) {
    changes.bedroomCount = currentValues.bedroomCount
  }
  if (initialValues.bathroomCount !== currentValues.bathroomCount) {
    changes.bathroomCount = currentValues.bathroomCount
  }
  if (initialValues.kitchenType !== currentValues.kitchenType) {
    changes.kitchenType = currentValues.kitchenType
  }
  if (initialValues.size !== currentValues.size)
    changes.size = currentValues.size
  if (initialValues.contractMonths !== currentValues.contractMonths) {
    changes.contractMonths = currentValues.contractMonths
  }
  if (initialValues.occupancy !== currentValues.occupancy) {
    changes.occupancy = currentValues.occupancy
  }
  if (initialValues.isCookingAllowed !== currentValues.isCookingAllowed) {
    changes.isCookingAllowed = currentValues.isCookingAllowed
  }
  if (initialValues.isPetAllowed !== currentValues.isPetAllowed) {
    changes.isPetAllowed = currentValues.isPetAllowed
  }

  if (
    !areStringArraysEqual(initialValues.facilities, currentValues.facilities)
  ) {
    changes.facilities = currentValues.facilities
  }

  if (!areMediaArraysEqual(initialValues.media, currentValues.media)) {
    changes.media = currentValues.media
  }

  if (initialValues.description !== currentValues.description) {
    changes.description = currentValues.description
  }

  if (initialValues.privateNote !== currentValues.privateNote) {
    changes.privateNote = currentValues.privateNote
  }

  const initialAvailableAt = serializeListingAvailabilityForApi({
    availabilityMode: initialValues.availabilityMode,
    availableFromDate: initialValues.availableFromDate,
  })
  const currentAvailableAt = serializeListingAvailabilityForApi({
    availabilityMode: currentValues.availabilityMode,
    availableFromDate: currentValues.availableFromDate,
  })

  if (!areAvailableAtValuesEqual(initialAvailableAt, currentAvailableAt)) {
    changes.availableAt = currentAvailableAt
  }

  return changes
}

function isListingValid(values: ListingFormValues) {
  return (
    (values.visibility === "PUBLIC" || values.visibility === "PRIVATE") &&
    isNumberInRange(values.rent, 0, Number.MAX_SAFE_INTEGER) &&
    isNumberInRange(values.deposit, 0, Number.MAX_SAFE_INTEGER) &&
    isNumberInRange(values.moveInCost, 0, Number.MAX_SAFE_INTEGER) &&
    isNullableNumberInRange(values.electricRate, 0, 50) &&
    isNullableNumberInRange(values.waterRate, 0, 100) &&
    isIntegerInRange(values.bedroomCount, 0, 20) &&
    isIntegerInRange(values.bathroomCount, 0, 20) &&
    values.kitchenType.length > 0 &&
    isNullableNumberInRange(values.size, 0, Number.MAX_SAFE_INTEGER) &&
    isIntegerInRange(values.contractMonths, 1, 60) &&
    isIntegerInRange(values.occupancy, 1, 50) &&
    isListingAvailabilityFormValid(
      values.availabilityMode,
      values.availableFromDate,
    ) &&
    values.privateNote.length <= PRIVATE_NOTE_MAX_LENGTH
  )
}

export function ListingForm({
  mode = "create",
  defaultValues,
  submitLabel,
  onSubmit,
}: ListingFormProps) {
  const fieldIdPrefix = useId()
  const [savedValues, setSavedValues] = useState(() =>
    buildFormValues(defaultValues),
  )
  const [values, setValues] = useState<ListingFormState>(() =>
    buildFormState(savedValues),
  )
  const [photoUploadState, setPhotoUploadState] = useState<MediaUploaderState>({
    isUploading: false,
    hasFailedUpload: false,
    media: savedValues.media,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const normalizedInitialValues = useMemo(
    () => buildFormValues(savedValues),
    [savedValues],
  )

  const normalizedValues = useMemo(
    () => normalizeListingValues(values),
    [values],
  )

  const changedValues = useMemo(
    () => buildChangedListingValues(normalizedInitialValues, normalizedValues),
    [normalizedInitialValues, normalizedValues],
  )

  const hasChanges = mode === "create" || Object.keys(changedValues).length > 0
  const hasPhoto = normalizedValues.media.length > 0
  const isValid = isListingValid(normalizedValues) && hasPhoto
  const canSave =
    isValid &&
    hasChanges &&
    !photoUploadState.isUploading &&
    !photoUploadState.hasFailedUpload &&
    !isSubmitting

  const updateField = (field: keyof ListingFormState, value: string) => {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }))
  }

  const updateBooleanField = (
    field:
      | "isForeignerAccepted"
      | "isTM30Provided"
      | "isCookingAllowed"
      | "isPetAllowed",
    value: boolean,
  ) => {
    if (isSubmitting) return

    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }))
  }

  return (
    <form
      className="space-y-0"
      onSubmit={async (event) => {
        event.preventDefault()
        if (!canSave) return

        setSubmitError("")
        setIsSubmitting(true)

        try {
          await onSubmit?.(mode === "edit" ? changedValues : normalizedValues)

          if (mode === "edit") {
            setSavedValues(normalizedValues)
            setValues(buildFormState(normalizedValues))
          }
        } catch (error) {
          setSubmitError(getFormErrorMessage(error, "Could not save listing"))
        } finally {
          setIsSubmitting(false)
        }
      }}
    >
      <div className="space-y-3 pb-6">
        <MediaUploader
          purpose="listing-photo"
          label="Listing photos"
          description="Upload at least one clear photo of the room."
          disabled={isSubmitting}
          defaultMedia={savedValues.media}
          onUploadStateChange={(state) => {
            setPhotoUploadState(state)
            setValues((currentValues) => ({
              ...currentValues,
              media: state.media,
            }))
          }}
        />

        {photoUploadState.hasFailedUpload && (
          <p className="text-sm font-medium text-red-600" role="alert">
            Remove or retry failed photos first.
          </p>
        )}

        {!hasPhoto && (
          <p className="text-sm text-slate-500">
            Add at least one room photo to continue.
          </p>
        )}
      </div>

      <FormSection title="Visibility, availability, and contract">
        <div
          className={getHorizontalScrollRowClass("items-center gap-2")}
          role="group"
          aria-label="Visibility, availability, and contract"
        >
          <ListingVisibilityField
            id={`${fieldIdPrefix}-visibility`}
            value={values.visibility}
            disabled={isSubmitting}
            required
            aria-label="Visibility"
            onChange={(visibility) => updateField("visibility", visibility)}
          />

          <ListingAvailabilityField
            id={`${fieldIdPrefix}-availability`}
            value={{
              availabilityMode: values.availabilityMode,
              availableFromDate: values.availableFromDate,
            }}
            disabled={isSubmitting}
            required
            disablePast
            triggerVariant="tab"
            aria-label="Availability"
            error={
              isListingAvailabilityFormValid(
                values.availabilityMode,
                values.availableFromDate,
              )
                ? undefined
                : "Choose an available-from date"
            }
            onChange={(availability) =>
              setValues((currentValues) => ({
                ...currentValues,
                ...availability,
              }))
            }
          />

          <ListingContractField
            id={`${fieldIdPrefix}-contract-months`}
            value={values.contractMonths}
            disabled={isSubmitting}
            required
            aria-label="Minimum contract"
            onChange={(contractMonths) =>
              updateField("contractMonths", String(contractMonths))
            }
          />
        </div>
      </FormSection>

      <FormSection title="Price">
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            id={`${fieldIdPrefix}-rent`}
            name="rent"
            label="Rent"
            value={values.rent}
            min={0}
            required
            disabled={isSubmitting}
            onChange={(value) => updateField("rent", value)}
          />
          <NumberField
            id={`${fieldIdPrefix}-deposit`}
            name="deposit"
            label="Deposit"
            value={values.deposit}
            min={0}
            required
            disabled={isSubmitting}
            onChange={(value) => updateField("deposit", value)}
          />
          <NumberField
            id={`${fieldIdPrefix}-move-in-cost`}
            name="moveInCost"
            label="Move-in cost"
            value={values.moveInCost}
            min={0}
            required
            disabled={isSubmitting}
            onChange={(value) => updateField("moveInCost", value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            id={`${fieldIdPrefix}-electric-rate`}
            name="electricRate"
            label="Electric rate"
            value={values.electricRate}
            min={0}
            max={50}
            disabled={isSubmitting}
            onChange={(value) => updateField("electricRate", value)}
          />
          <NumberField
            id={`${fieldIdPrefix}-water-rate`}
            name="waterRate"
            label="Water rate"
            value={values.waterRate}
            min={0}
            max={100}
            disabled={isSubmitting}
            onChange={(value) => updateField("waterRate", value)}
          />
        </div>
      </FormSection>

      <FormSection title="Room details">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id={`${fieldIdPrefix}-bedroom-count`}
            name="bedroomCount"
            label="Bedrooms"
            value={values.bedroomCount}
            options={BEDROOM_OPTIONS}
            disabled={isSubmitting}
            onChange={(value) => updateField("bedroomCount", value)}
          />
          <SelectField
            id={`${fieldIdPrefix}-bathroom-count`}
            name="bathroomCount"
            label="Bathrooms"
            value={values.bathroomCount}
            options={BATHROOM_OPTIONS}
            disabled={isSubmitting}
            onChange={(value) => updateField("bathroomCount", value)}
          />
          <SelectField
            id={`${fieldIdPrefix}-kitchen-type`}
            name="kitchenType"
            label="Kitchen"
            value={values.kitchenType}
            options={KITCHEN_TYPE_OPTIONS}
            disabled={isSubmitting}
            onChange={(value) => updateField("kitchenType", value)}
          />
          <NumberField
            id={`${fieldIdPrefix}-size`}
            name="size"
            label="Size"
            value={values.size}
            min={0}
            disabled={isSubmitting}
            onChange={(value) => updateField("size", value)}
          />
        </div>
      </FormSection>

      <FormSection title="Rules and documents">
        <div className="space-y-4">
          <SingleOptionSelector
            label="Occupancy"
            options={OCCUPANCY_OPTIONS}
            value={Number(values.occupancy)}
            required
            disabled={isSubmitting}
            onChange={(occupancy) => {
              if (typeof occupancy !== "number") return
              updateField("occupancy", String(occupancy))
            }}
          />

          <fieldset className="m-0 min-w-0 border-0 p-0" disabled={isSubmitting}>
            <legend className="mb-2 p-0 text-sm font-semibold text-slate-950">
              Rules
            </legend>
            <p className="mb-2 text-xs leading-5 text-slate-500">
              Select everything that applies.
            </p>

            <div className="flex flex-wrap gap-2">
              <BooleanOptionSelector
                label="Foreigner accepted"
                value={values.isForeignerAccepted}
                disabled={isSubmitting}
                onChange={(value) =>
                  updateBooleanField(
                    "isForeignerAccepted",
                    value === true,
                  )
                }
              />
              <BooleanOptionSelector
                label="TM30 provided"
                value={values.isTM30Provided}
                disabled={isSubmitting}
                onChange={(value) =>
                  updateBooleanField("isTM30Provided", value === true)
                }
              />
              <BooleanOptionSelector
                label="Cooking allowed"
                value={values.isCookingAllowed}
                disabled={isSubmitting}
                onChange={(value) =>
                  updateBooleanField("isCookingAllowed", value === true)
                }
              />
              <BooleanOptionSelector
                label="Pets allowed"
                value={values.isPetAllowed}
                disabled={isSubmitting}
                onChange={(value) =>
                  updateBooleanField("isPetAllowed", value === true)
                }
              />
            </div>
          </fieldset>
        </div>
      </FormSection>

      <FormSection title="Facilities">
        <MultiOptionSelector
          label="Facilities"
          options={LISTING_FACILITY_OPTIONS}
          value={values.facilities}
          disabled={isSubmitting}
          className="[&_legend]:sr-only [&_legend]:m-0 [&_legend]:p-0"
          onChange={(facilities) => {
            if (isSubmitting) return

            setValues((currentValues) => ({
              ...currentValues,
              facilities: Array.isArray(facilities) ? facilities : [],
            }))
          }}
        />
      </FormSection>

      <FormSection title="Description" titleId={`${fieldIdPrefix}-description-heading`}>
        <Textarea
          id={`${fieldIdPrefix}-description`}
          aria-labelledby={`${fieldIdPrefix}-description-heading`}
          value={values.description}
          placeholder="Describe the room, furniture, location, or move-in details."
          disabled={isSubmitting}
          className="whitespace-pre-wrap break-words text-sm leading-5 text-slate-700"
          onChange={(event) => updateField("description", event.target.value)}
        />
      </FormSection>

      <FormSection
        title="Private note"
        titleId={`${fieldIdPrefix}-private-note-heading`}
      >
        <p
          id={`${fieldIdPrefix}-private-note-description`}
          className="text-xs leading-5 text-slate-500"
        >
          Only visible to you. Use this for gate codes, viewing instructions, or
          other notes renters should not see.
        </p>
        <Textarea
          id={`${fieldIdPrefix}-private-note`}
          aria-labelledby={`${fieldIdPrefix}-private-note-heading`}
          aria-describedby={`${fieldIdPrefix}-private-note-description`}
          value={values.privateNote}
          placeholder="Example: Gate code 1234. Call before viewing."
          disabled={isSubmitting}
          maxLength={PRIVATE_NOTE_MAX_LENGTH}
          className="whitespace-pre-wrap break-words text-sm leading-5 text-slate-700"
          onChange={(event) => updateField("privateNote", event.target.value)}
        />
      </FormSection>

      <div className="space-y-4 border-t border-slate-100 pt-6">
        {submitError && (
          <p className="text-sm font-medium text-red-600" role="alert">
            {submitError}
          </p>
        )}

        {!isValid && (
          <p className="text-sm text-slate-500">
            Add at least one photo and complete the required price and room
            details to continue.
          </p>
        )}

        <p className="text-xs leading-5 text-slate-500">
          Please make sure you have permission to list this room and that the
          details are accurate.
        </p>

        <Button
          type="submit"
          className="h-11 w-full rounded-full"
          disabled={!canSave}
        >
          {photoUploadState.isUploading
            ? "Uploading..."
            : isSubmitting
              ? "Saving..."
              : (submitLabel ??
                (mode === "edit" && isValid && !hasChanges
                  ? "No changes"
                  : mode === "edit"
                    ? "Save changes"
                    : "Continue"))}
        </Button>
      </div>
    </form>
  )
}

function FormSection({
  title,
  titleId,
  children,
}: {
  title: string
  titleId?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-4 py-6" aria-labelledby={titleId}>
      <div className="relative">
        <div
          className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-slate-200"
          aria-hidden="true"
        />
        <h2
          id={titleId}
          className="relative inline-block bg-white pr-3 text-sm font-semibold text-slate-950"
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

function NumberField({
  id,
  name,
  label,
  value,
  min,
  max,
  required = false,
  disabled,
  onChange,
}: {
  id: string
  name: string
  label: string
  value: string
  min?: number
  max?: number
  required?: boolean
  disabled: boolean
  onChange: (value: string) => void
}) {
  return (
    <FormField label={label} required={required}>
      <Input
        id={id}
        name={name}
        type="number"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        inputMode="decimal"
        onChange={(event) => onChange(event.target.value)}
      />
    </FormField>
  )
}

function SelectField({
  id,
  name,
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  id: string
  name: string
  label: string
  value: string
  options: { label: string; value: string | number }[]
  disabled: boolean
  onChange: (value: string) => void
}) {
  return (
    <FormField label={label} required>
      <Select
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </FormField>
  )
}
