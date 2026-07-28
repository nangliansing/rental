import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react"

import { cn } from "@/lib/utils"
import { hasReactNodeContent } from "@/shared/utils/reactNode"

type FormControlProps = {
  id?: string
  required?: boolean
  "aria-describedby"?: string
  "aria-invalid"?: boolean | "true" | "false"
}

type FormFieldProps = {
  label: ReactNode
  children?: ReactElement<FormControlProps>
  id?: string
  description?: ReactNode
  error?: ReactNode
  required?: boolean
  className?: string
}

function FormField({
  label,
  children,
  id,
  description,
  error,
  required = false,
  className,
}: FormFieldProps) {
  const generatedId = useId()
  const child = isValidElement<FormControlProps>(children) ? children : null
  const controlId = child?.props.id ?? id ?? generatedId
  const hasDescription = hasReactNodeContent(description)
  const hasError = hasReactNodeContent(error)
  const descriptionId = hasDescription ? `${controlId}-description` : undefined
  const errorId = hasError ? `${controlId}-error` : undefined
  const describedBy = [
    child?.props["aria-describedby"],
    descriptionId,
    errorId,
  ]
    .filter(Boolean)
    .join(" ")

  const control = child
    ? cloneElement(child, {
        id: controlId,
        required: child.props.required ?? required,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": hasError ? true : child.props["aria-invalid"],
      })
    : null

  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={controlId} className="block text-sm font-semibold text-slate-950">
        {label}
        {required && (
          <span className="text-red-600" aria-hidden="true">
            {" "}*
          </span>
        )}
      </label>

      {hasDescription && (
        <p id={descriptionId} className="text-xs leading-5 text-slate-500">
          {description}
        </p>
      )}

      {control}

      {hasError && (
        <p id={errorId} className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export { FormField }
