import * as React from "react"
import { Toast as ToastPrimitive } from "radix-ui"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type ToastVariant = "default" | "search-hint"

const toastVariantClasses: Record<ToastVariant, string> = {
  default:
    "rounded-lg border border-slate-200 bg-white p-3 text-slate-950 shadow-lg",
  "search-hint":
    "w-auto max-w-[min(calc(100vw-2rem),28rem)] rounded-full border border-blue-600/50 bg-blue-50/85 px-3 py-2 text-blue-900 shadow-md backdrop-blur-sm",
}

const toastTitleVariantClasses: Record<ToastVariant, string> = {
  default: "text-sm font-medium leading-5",
  "search-hint":
    "min-w-0 flex-1 truncate text-sm font-semibold leading-5 text-blue-900",
}

const toastCloseVariantClasses: Record<ToastVariant, string> = {
  default:
    "absolute top-2 right-2 rounded-md p-1 text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-slate-100 hover:text-slate-950 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-slate-950/20 focus-visible:outline-none",
  "search-hint":
    "static shrink-0 rounded-full p-1 text-blue-700 opacity-100 hover:bg-blue-100/90 hover:text-blue-950 focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:outline-none",
}

function ToastProvider(
  props: React.ComponentProps<typeof ToastPrimitive.Provider>,
) {
  return <ToastPrimitive.Provider data-slot="toast-provider" {...props} />
}

function ToastViewport({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        "fixed top-[calc(env(safe-area-inset-top)+0.75rem)] left-1/2 z-[10000] flex w-max max-w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 flex-col gap-2 outline-none",
        className,
      )}
      {...props}
    />
  )
}

function Toast({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Root> & {
  variant?: ToastVariant
}) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      className={cn(
        "group pointer-events-auto relative flex items-center gap-2.5 overflow-hidden transition-all data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-top-full data-[state=open]:animate-in data-[state=open]:fade-in-80 data-[state=open]:slide-in-from-top-full",
        toastVariantClasses[variant],
        className,
      )}
      {...props}
    />
  )
}

function ToastTitle({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Title> & {
  variant?: ToastVariant
}) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn(toastTitleVariantClasses[variant], className)}
      {...props}
    />
  )
}

function ToastDescription({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Description>) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn("text-xs leading-5 text-slate-600", className)}
      {...props}
    />
  )
}

function ToastClose({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Close> & {
  variant?: ToastVariant
}) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      className={cn(toastCloseVariantClasses[variant], className)}
      toast-close=""
      {...props}
    >
      <XIcon className="size-4" aria-hidden="true" />
    </ToastPrimitive.Close>
  )
}

export {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
}
