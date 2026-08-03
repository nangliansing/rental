import { Search } from "lucide-react"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  type ToastVariant,
} from "@/components/ui/toast"
import { useToast, TOAST_DURATIONS_MS } from "@/hooks/use-toast"

function ToastLeadingIcon({ variant }: { variant: ToastVariant }) {
  if (variant !== "search-hint") return null

  return (
    <Search
      className="size-4 shrink-0 text-blue-700"
      aria-hidden="true"
      strokeWidth={2.5}
    />
  )
}

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <ToastProvider duration={TOAST_DURATIONS_MS.default}>
      {toasts.map(({ id, title, description, open, variant = "default" }) => (
        <Toast
          key={id}
          variant={variant}
          duration={TOAST_DURATIONS_MS[variant]}
          open={open}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) dismiss(id)
          }}
        >
          <ToastLeadingIcon variant={variant} />
          {variant === "search-hint" ? (
            title ? <ToastTitle variant={variant}>{title}</ToastTitle> : null
          ) : (
            <div className="grid min-w-0 flex-1 gap-1 pr-6">
              {title ? <ToastTitle variant={variant}>{title}</ToastTitle> : null}
              {description ? (
                <ToastDescription>{description}</ToastDescription>
              ) : null}
            </div>
          )}
          <ToastClose variant={variant} aria-label="Dismiss notification" />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
