import { useId, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { MultiOptionSelector } from "@/shared/components/inputs/MultiOptionSelector"
import {
  BUILDING_FACILITY_OPTIONS,
  BUILDING_SECURITY_OPTIONS,
  BUILDING_TYPE_OPTIONS,
} from "@/shared/options/rental-options"

import {
  areStringArraysEqual,
  getFormErrorMessage,
  normalizeFormText,
  sortFormStrings,
} from "../utils/formFieldUtils"

export type BuildingFormValues = {
  name: string
  buildingType: string
  facilities: string[]
  security: string[]
  address: string
}

export type BuildingFormMode = "create" | "edit"

export type BuildingFormSubmitValues =
  BuildingFormValues | Partial<BuildingFormValues>

const initialValues: BuildingFormValues = {
  name: "",
  buildingType: "Apartment",
  facilities: [],
  security: [],
  address: "",
}

type BuildingFormProps = {
  mode?: BuildingFormMode
  defaultValues?: Partial<BuildingFormValues>
  submitLabel?: string
  helperText?: string
  submitDisabled?: boolean
  onSubmit?: (values: BuildingFormSubmitValues) => void | Promise<void>
}

function buildFormValues(
  values?: Partial<BuildingFormValues>,
): BuildingFormValues {
  return {
    ...initialValues,
    ...values,
    name: values?.name ?? "",
    buildingType: values?.buildingType ?? initialValues.buildingType,
    facilities: values?.facilities ?? [],
    security: values?.security ?? [],
    address: values?.address ?? "",
  }
}

function normalizeBuildingValues(
  values: BuildingFormValues,
): BuildingFormValues {
  return {
    name: normalizeFormText(values.name),
    buildingType: normalizeFormText(values.buildingType),
    facilities: sortFormStrings(values.facilities),
    security: sortFormStrings(values.security),
    address: normalizeFormText(values.address),
  }
}

function buildChangedBuildingValues(
  initialValues: BuildingFormValues,
  currentValues: BuildingFormValues,
): Partial<BuildingFormValues> {
  const changes: Partial<BuildingFormValues> = {}

  if (initialValues.name !== currentValues.name) {
    changes.name = currentValues.name
  }

  if (initialValues.buildingType !== currentValues.buildingType) {
    changes.buildingType = currentValues.buildingType
  }

  if (
    !areStringArraysEqual(initialValues.facilities, currentValues.facilities)
  ) {
    changes.facilities = currentValues.facilities
  }

  if (!areStringArraysEqual(initialValues.security, currentValues.security)) {
    changes.security = currentValues.security
  }

  if (initialValues.address !== currentValues.address) {
    changes.address = currentValues.address
  }

  return changes
}

export function BuildingForm({
  mode = "create",
  defaultValues,
  submitLabel,
  helperText = "Please make sure you have permission to add this building and that the details are accurate.",
  submitDisabled = false,
  onSubmit,
}: BuildingFormProps) {
  const fieldIdPrefix = useId()
  const [savedValues, setSavedValues] = useState(() =>
    buildFormValues(defaultValues),
  )
  const [values, setValues] = useState<BuildingFormValues>(savedValues)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const normalizedInitialValues = useMemo(
    () => normalizeBuildingValues(savedValues),
    [savedValues],
  )

  const normalizedValues = useMemo(
    () => normalizeBuildingValues(values),
    [values],
  )

  const changedValues = useMemo(
    () => buildChangedBuildingValues(normalizedInitialValues, normalizedValues),
    [normalizedInitialValues, normalizedValues],
  )

  const hasChanges = mode === "create" || Object.keys(changedValues).length > 0
  const isValid =
    normalizedValues.name.length > 0 && normalizedValues.buildingType.length > 0
  const canSave =
    isValid && hasChanges && !isSubmitting && !submitDisabled

  const updateField = (field: keyof BuildingFormValues, value: string) => {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }))
  }

  const updateArrayField = (
    field: "facilities" | "security",
    selectedValues?: string[],
  ) => {
    if (isSubmitting) return

    setValues((currentValues) => ({
      ...currentValues,
      [field]: selectedValues ?? [],
    }))
  }

  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault()
        if (!canSave) return

        setSubmitError("")
        setIsSubmitting(true)

        try {
          await onSubmit?.(mode === "edit" ? changedValues : normalizedValues)

          if (mode === "edit") {
            setSavedValues(normalizedValues)
            setValues(normalizedValues)
          }
        } catch (error) {
          setSubmitError(getFormErrorMessage(error, "Could not save building"))
        } finally {
          setIsSubmitting(false)
        }
      }}
    >
      <div className="space-y-4">
        <FormField label="Building name" required>
          <Input
            id={`${fieldIdPrefix}-name`}
            name="name"
            value={values.name}
            placeholder="Building or apartment name"
            autoComplete="organization"
            disabled={isSubmitting}
            onChange={(event) => updateField("name", event.target.value)}
          />
        </FormField>

        <FormField label="Building type" required>
          <Select
            id={`${fieldIdPrefix}-building-type`}
            name="buildingType"
            value={values.buildingType}
            disabled={isSubmitting}
            onChange={(event) =>
              updateField("buildingType", event.target.value)
            }
          >
            {BUILDING_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Address">
          <Textarea
            id={`${fieldIdPrefix}-address`}
            name="address"
            value={values.address}
            placeholder="Street, area, or nearby landmark"
            autoComplete="street-address"
            disabled={isSubmitting}
            onChange={(event) => updateField("address", event.target.value)}
          />
        </FormField>

        <MultiOptionSelector
          label="Facilities"
          options={BUILDING_FACILITY_OPTIONS}
          value={values.facilities}
          disabled={isSubmitting}
          onChange={(value) => updateArrayField("facilities", value)}
        />

        <MultiOptionSelector
          label="Security"
          options={BUILDING_SECURITY_OPTIONS}
          value={values.security}
          disabled={isSubmitting}
          onChange={(value) => updateArrayField("security", value)}
        />
      </div>

      {submitError && (
        <p className="text-sm font-medium text-red-600" role="alert">
          {submitError}
        </p>
      )}

      {helperText && (
        <p className="text-xs leading-5 text-slate-500">{helperText}</p>
      )}

      <Button
        type="submit"
        className="h-11 w-full rounded-full"
        disabled={!canSave}
      >
        {isSubmitting
          ? "Saving..."
          : (submitLabel ??
            (mode === "edit" && isValid && !hasChanges
              ? "No changes"
              : mode === "edit"
                ? "Save changes"
                : "Continue"))}
      </Button>
    </form>
  )
}
