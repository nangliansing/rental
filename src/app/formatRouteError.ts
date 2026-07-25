import { isRouteErrorResponse } from "react-router-dom"

export type RouteErrorVariant = "not-found" | "error"

export type FormattedRouteError = {
  title: string
  message: string
  technicalMessage: string
  errorName: string | null
  stack: string | null
  status: number | null
  detailText: string
  variant: RouteErrorVariant
}

function readRouteErrorData(error: { data: unknown }) {
  if (typeof error.data === "string" && error.data.trim()) {
    return error.data.trim()
  }

  if (
    error.data &&
    typeof error.data === "object" &&
    "message" in error.data &&
    typeof error.data.message === "string" &&
    error.data.message.trim()
  ) {
    return error.data.message.trim()
  }

  return null
}

function extractMissingRoutePath(message: string) {
  const routeMatch = message.match(/No route matches URL ["']([^"']+)["']/i)
  return routeMatch?.[1] ?? null
}

function getUserFriendly404Message(rawMessage: string | null) {
  if (!rawMessage) {
    return "The page you're looking for doesn't exist or may have been moved."
  }

  const missingPath = extractMissingRoutePath(rawMessage)
  if (missingPath) {
    return `We couldn't find a page at “${missingPath}”. The link may be outdated or mistyped.`
  }

  if (
    rawMessage.startsWith("Error:") ||
    /no route matches/i.test(rawMessage)
  ) {
    return "The page you're looking for doesn't exist or may have been moved."
  }

  return rawMessage
}

function buildDetailText({
  errorName,
  technicalMessage,
  stack,
  status,
}: {
  errorName: string | null
  technicalMessage: string
  stack: string | null
  status: number | null
}) {
  const header = errorName
    ? `${errorName}: ${technicalMessage}`
    : technicalMessage
  const statusLine = status ? `HTTP ${status}` : null
  const parts = [statusLine, header, stack].filter(
    (part): part is string => Boolean(part?.trim()),
  )

  return parts.join("\n\n").trim()
}

export function formatRouteError(error: unknown): FormattedRouteError {
  if (isRouteErrorResponse(error)) {
    const status = error.status
    const rawMessage =
      readRouteErrorData(error) ??
      error.statusText?.trim() ??
      "The app hit a problem while loading this page."
    const isNotFound = status === 404

    const title = isNotFound ? "Page not found" : "Something went wrong"
    const message = isNotFound
      ? getUserFriendly404Message(readRouteErrorData(error))
      : rawMessage

    return {
      title,
      message,
      technicalMessage: rawMessage,
      errorName: isNotFound ? "NotFoundError" : "RouteError",
      stack: null,
      status,
      variant: isNotFound ? "not-found" : "error",
      detailText: buildDetailText({
        errorName: isNotFound ? "NotFoundError" : "RouteError",
        technicalMessage: rawMessage,
        stack: null,
        status,
      }),
    }
  }

  if (error instanceof Error) {
    const technicalMessage =
      error.message.trim() ||
      "An unexpected error occurred while rendering this page."

    return {
      title: "Something went wrong",
      message:
        "Something unexpected happened while loading this page. You can try again or return home.",
      technicalMessage,
      errorName: error.name || "Error",
      stack: error.stack?.trim() ?? null,
      status: null,
      variant: "error",
      detailText: buildDetailText({
        errorName: error.name || "Error",
        technicalMessage,
        stack: error.stack?.trim() ?? null,
        status: null,
      }),
    }
  }

  if (typeof error === "string" && error.trim()) {
    const technicalMessage = error.trim()

    return {
      title: "Something went wrong",
      message:
        "Something unexpected happened while loading this page. You can try again or return home.",
      technicalMessage,
      errorName: "Error",
      stack: null,
      status: null,
      variant: "error",
      detailText: buildDetailText({
        errorName: "Error",
        technicalMessage,
        stack: null,
        status: null,
      }),
    }
  }

  const technicalMessage =
    "An unexpected error occurred while rendering this page."

  return {
    title: "Something went wrong",
    message:
      "Something unexpected happened while loading this page. You can try again or return home.",
    technicalMessage,
    errorName: "UnknownError",
    stack: null,
    status: null,
    variant: "error",
    detailText: buildDetailText({
      errorName: "UnknownError",
      technicalMessage,
      stack: null,
      status: null,
    }),
  }
}

export type ErrorTraceLine = {
  lineNumber: number
  text: string
  kind: "header" | "stack" | "meta"
}

export function buildErrorTraceLines({
  errorName,
  technicalMessage,
  stack,
  status,
}: {
  errorName: string | null
  technicalMessage: string
  stack: string | null
  status: number | null
}): ErrorTraceLine[] {
  const lines: ErrorTraceLine[] = []
  let lineNumber = 1

  if (status) {
    lines.push({
      lineNumber: lineNumber++,
      text: `HTTP ${status}`,
      kind: "meta",
    })
  }

  lines.push({
    lineNumber: lineNumber++,
    text: `${errorName ?? "Error"}: ${technicalMessage}`,
    kind: "header",
  })

  if (!stack) return lines

  const stackLines = stack.split("\n")
  const firstStackLine = stackLines[0]?.trim() ?? ""
  const startIndex =
    firstStackLine.includes(technicalMessage) ||
    firstStackLine.startsWith(`${errorName}:`)
      ? 1
      : 0

  for (const stackLine of stackLines.slice(startIndex)) {
    if (!stackLine.trim()) continue

    lines.push({
      lineNumber: lineNumber++,
      text: stackLine,
      kind: "stack",
    })
  }

  return lines
}
