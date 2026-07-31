import { type LucideIcon } from "lucide-react"

import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"
import type { FormEvent, ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type OptionRadioCardProps = {
  id: string
  name: string
  value: string | number
  checked: boolean
  disabled?: boolean
  label: string
  description: string
  descriptionId: string
  icon?: LucideIcon
  onSelect: () => void
}

export function OptionRadioCard({
  id,
  name,
  value,
  checked,
  disabled = false,
  label,
  description,
  descriptionId,
  icon: Icon,
  onSelect,
}: OptionRadioCardProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
        "hover:border-slate-400 hover:bg-slate-50",
        "focus-within:border-slate-950 focus-within:bg-slate-50",
        "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60",
        checked ? "border-slate-950 bg-slate-50" : "border-slate-200 bg-white",
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        aria-describedby={descriptionId}
        className="sr-only"
        onChange={onSelect}
      />

      {Icon ? (
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            checked ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600",
          )}
          aria-hidden="true"
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      ) : null}

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-5 text-slate-950">
          {label}
        </span>
        <span
          id={descriptionId}
          className="block text-xs leading-4 text-slate-500"
        >
          {description}
        </span>
      </span>

      <span
        className={cn(
          "h-4 w-4 shrink-0 rounded-full border-2",
          checked ? "border-[5px] border-slate-950" : "border-slate-300",
        )}
        aria-hidden="true"
      />
    </label>
  )
}

type OptionEditFormShellProps = {
  className?: string
  legend: string
  isSubmitting?: boolean
  hasChanged: boolean
  errorMessage?: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  children: ReactNode
}

export function OptionEditFormShell({
  className,
  legend,
  isSubmitting = false,
  hasChanged,
  errorMessage,
  onSubmit,
  children,
}: OptionEditFormShellProps) {
  return (
    <form
      className={cn("flex min-h-0 flex-1 flex-col", className)}
      onSubmit={onSubmit}
    >
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 md:px-5">
        <fieldset
          className="m-0 min-w-0 space-y-2 border-0 p-0"
          disabled={isSubmitting}
        >
          <legend className="sr-only">{legend}</legend>
          {children}
        </fieldset>

        {errorMessage ? (
          <p
            role="alert"
            className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {errorMessage}
          </p>
        ) : null}
      </div>

      <footer className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:flex md:justify-end md:px-5">
        <Button
          type="submit"
          className="h-11 w-full rounded-full bg-slate-950 text-white hover:bg-slate-800 md:h-9 md:w-auto md:min-w-24 md:px-5"
          disabled={isSubmitting || !hasChanged}
        >
          {isSubmitting && <LoaderIcon className="h-4 w-4" />}
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
      </footer>
    </form>
  )
}
