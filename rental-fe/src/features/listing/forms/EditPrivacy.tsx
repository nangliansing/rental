import { Globe2, Loader2, Lock } from "lucide-react"
import { useId, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { ListingVisibility } from "../types"

type PrivacyOption = {
  description: string
  icon: typeof Globe2
  label: string
  value: ListingVisibility
}

const PRIVACY_OPTIONS: readonly PrivacyOption[] = [
  {
    value: "PUBLIC",
    label: "Public",
    description: "Anyone can find and view this listing.",
    icon: Globe2,
  },
  {
    value: "PRIVATE",
    label: "Private",
    description: "Only you can view it. It will not appear in search.",
    icon: Lock,
  },
]

export type EditPrivacyProps = {
  currentVisibility?: ListingVisibility | null
  errorMessage?: string | null
  isSubmitting?: boolean
  onSubmit: (visibility: ListingVisibility) => void | Promise<void>
}

function normalizeVisibility(
  visibility: ListingVisibility | null | undefined,
): ListingVisibility {
  return visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC"
}

function normalizeErrorMessage(errorMessage: string | null | undefined) {
  return typeof errorMessage === "string" ? errorMessage.trim() : ""
}

export function EditPrivacy({
  currentVisibility,
  errorMessage,
  isSubmitting = false,
  onSubmit,
}: EditPrivacyProps) {
  const groupId = useId()
  const normalizedCurrentVisibility = normalizeVisibility(currentVisibility)
  const normalizedErrorMessage = normalizeErrorMessage(errorMessage)
  const [visibility, setVisibility] = useState<ListingVisibility>(
    normalizedCurrentVisibility,
  )
  const hasChanged = visibility !== normalizedCurrentVisibility

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSubmitting || !hasChanged) return
    void onSubmit(visibility)
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <fieldset
        className="m-0 min-w-0 space-y-2 border-0 p-0"
        disabled={isSubmitting}
      >
        <legend className="sr-only">Choose listing privacy</legend>

        {PRIVACY_OPTIONS.map((option) => {
          const Icon = option.icon
          const isSelected = visibility === option.value
          const optionId = `${groupId}-${option.value.toLowerCase()}`
          const descriptionId = `${optionId}-description`

          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                "hover:border-slate-400 hover:bg-slate-50",
                "focus-within:border-slate-950 focus-within:bg-slate-50",
                "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60",
                isSelected
                  ? "border-slate-950 bg-slate-50"
                  : "border-slate-200 bg-white",
              )}
            >
              <input
                id={optionId}
                type="radio"
                name={`${groupId}-listing-privacy`}
                value={option.value}
                checked={isSelected}
                disabled={isSubmitting}
                aria-describedby={descriptionId}
                className="sr-only"
                onChange={() => setVisibility(option.value)}
              />

              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  isSelected
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-600",
                )}
                aria-hidden="true"
              >
                <Icon className="h-3.5 w-3.5" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-5 text-slate-950">
                  {option.label}
                </span>
                <span
                  id={descriptionId}
                  className="block text-xs leading-4 text-slate-500"
                >
                  {option.description}
                </span>
              </span>

              <span
                className={cn(
                  "h-4 w-4 shrink-0 rounded-full border-2",
                  isSelected
                    ? "border-[5px] border-slate-950"
                    : "border-slate-300",
                )}
                aria-hidden="true"
              />
            </label>
          )
        })}
      </fieldset>

      {normalizedErrorMessage && (
        <p
          role="alert"
          className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {normalizedErrorMessage}
        </p>
      )}

      <div className="flex justify-end pt-1">
        <Button
          type="submit"
          className="h-9 min-w-24 rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800"
          disabled={isSubmitting || !hasChanged}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  )
}
