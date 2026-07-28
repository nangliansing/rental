import { useId, useState, type FormEvent } from "react"

import { normalizeDialogErrorMessage } from "../utils/normalizeDialogErrorMessage"
import {
  LISTING_PRIVACY_OPTIONS,
  normalizeListingVisibility,
} from "../utils/listingPrivacy"
import type { ListingVisibility } from "../types"
import { OptionEditFormShell, OptionRadioCard } from "./OptionEditControls"

export type EditPrivacyProps = {
  currentVisibility?: ListingVisibility | null
  errorMessage?: string | null
  isSubmitting?: boolean
  className?: string
  onSubmit: (visibility: ListingVisibility) => void | Promise<void>
}

export function EditPrivacy({
  currentVisibility,
  errorMessage,
  isSubmitting = false,
  className,
  onSubmit,
}: EditPrivacyProps) {
  const groupId = useId()
  const normalizedCurrentVisibility =
    normalizeListingVisibility(currentVisibility)
  const normalizedErrorMessage = normalizeDialogErrorMessage(errorMessage)
  const [visibility, setVisibility] = useState<ListingVisibility>(
    normalizedCurrentVisibility,
  )
  const hasChanged = visibility !== normalizedCurrentVisibility

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (isSubmitting || !hasChanged) return
    void onSubmit(visibility)
  }

  return (
    <OptionEditFormShell
      className={className}
      legend="Choose listing privacy"
      isSubmitting={isSubmitting}
      hasChanged={hasChanged}
      errorMessage={normalizedErrorMessage || undefined}
      onSubmit={handleSubmit}
    >
      {LISTING_PRIVACY_OPTIONS.map((option) => {
        const optionId = `${groupId}-${option.value.toLowerCase()}`

        return (
          <OptionRadioCard
            key={option.value}
            id={optionId}
            name={`${groupId}-listing-privacy`}
            value={option.value}
            checked={visibility === option.value}
            disabled={isSubmitting}
            label={option.label}
            description={option.description}
            descriptionId={`${optionId}-description`}
            icon={option.icon}
            onSelect={() => setVisibility(option.value)}
          />
        )
      })}
    </OptionEditFormShell>
  )
}
