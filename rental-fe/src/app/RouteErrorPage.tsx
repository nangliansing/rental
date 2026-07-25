import { AlertTriangle, ArrowLeft, ChevronDown, Home, RotateCcw } from "lucide-react"
import { useRouteError } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useNavigateBack } from "@/shared/hooks/useNavigateBack"

import { ErrorPageBackdrop } from "./ErrorPageBackdrop"
import { ErrorStackTracePanel } from "./ErrorStackTracePanel"
import { formatRouteError } from "./formatRouteError"

export function RouteErrorPage() {
  const error = useRouteError()
  const navigateBack = useNavigateBack("/")
  const formattedError = formatRouteError(error)
  const showTechnicalDetails = Boolean(
    formattedError.detailText ||
      formattedError.stack ||
      formattedError.status,
  )

  return (
    <main className="fixed inset-0 z-[900] overflow-y-auto">
      <ErrorPageBackdrop />

      <div className="relative flex min-h-dvh w-full items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-lg text-center">
          <AlertTriangle
            className="mx-auto h-8 w-8 text-slate-500"
            strokeWidth={1.75}
            aria-hidden="true"
          />

          {formattedError.status && (
            <p className="mt-5 text-sm font-medium tracking-wide text-slate-500">
              {formattedError.status}
            </p>
          )}

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {formattedError.title}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600">
            {formattedError.message}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <Button type="button" onClick={() => window.location.reload()}>
              <RotateCcw data-icon="inline-start" />
              Try again
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                window.location.assign("/")
              }}
            >
              <Home data-icon="inline-start" />
              Go home
            </Button>
            <Button type="button" variant="ghost" onClick={navigateBack}>
              <ArrowLeft data-icon="inline-start" />
              Go back
            </Button>
          </div>

          {showTechnicalDetails && (
            <details
              className="group mt-12 text-left"
              open={import.meta.env.DEV}
            >
              <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-950 [&::-webkit-details-marker]:hidden">
                Technical details
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
              </summary>

              <div className="mt-4 space-y-3">
                <p className="text-center text-xs leading-5 text-slate-500">
                  For developers. Share this when reporting a bug.
                </p>
                <ErrorStackTracePanel
                  errorName={formattedError.errorName}
                  technicalMessage={formattedError.technicalMessage}
                  stack={formattedError.stack}
                  status={formattedError.status}
                  detailText={formattedError.detailText}
                />
              </div>
            </details>
          )}
        </div>
      </div>
    </main>
  )
}
