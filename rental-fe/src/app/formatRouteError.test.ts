import { describe, expect, it } from "vitest"

import {
  buildErrorTraceLines,
  formatRouteError,
} from "./formatRouteError"

describe("formatRouteError", () => {
  it("formats javascript errors with stack traces", () => {
    const error = new Error("Provider missing")
    error.stack = [
      "Error: Provider missing",
      "    at useListingDetail (ListingDetailContext.tsx:22:9)",
      "    at ListingDetailPostSection (ListingDetailContent.tsx:49:66)",
    ].join("\n")

    expect(formatRouteError(error)).toMatchObject({
      title: "Something went wrong",
      message:
        "Something unexpected happened while loading this page. You can try again or return home.",
      technicalMessage: "Provider missing",
      errorName: "Error",
      stack: error.stack,
      status: null,
      variant: "error",
      detailText: expect.stringContaining("Provider missing"),
    })
  })

  it("formats route error responses with friendly 404 copy", () => {
    expect(
      formatRouteError({
        status: 404,
        statusText: "Not Found",
        data: 'Error: No route matches URL "/hahah"',
        internal: false,
      }),
    ).toMatchObject({
      title: "Page not found",
      message: 'We couldn\'t find a page at “/hahah”. The link may be outdated or mistyped.',
      technicalMessage: 'Error: No route matches URL "/hahah"',
      errorName: "NotFoundError",
      stack: null,
      status: 404,
      variant: "not-found",
      detailText: expect.stringContaining("HTTP 404"),
    })
  })

  it("preserves custom not-found messages for users", () => {
    expect(
      formatRouteError({
        status: 404,
        statusText: "Not Found",
        data: "Listing was removed",
        internal: false,
      }),
    ).toMatchObject({
      message: "Listing was removed",
      technicalMessage: "Listing was removed",
    })
  })

  it("formats plain strings and unknown values", () => {
    expect(formatRouteError("Network request failed")).toMatchObject({
      title: "Something went wrong",
      technicalMessage: "Network request failed",
      errorName: "Error",
    })

    expect(formatRouteError({ code: "ERR" })).toMatchObject({
      title: "Something went wrong",
      errorName: "UnknownError",
    })
  })
})

describe("buildErrorTraceLines", () => {
  it("renders a vscode-style trace with line numbers", () => {
    expect(
      buildErrorTraceLines({
        errorName: "Error",
        technicalMessage: "Boom",
        stack: [
          "Error: Boom",
          "    at Component (file.tsx:10:5)",
        ].join("\n"),
        status: null,
      }),
    ).toEqual([
      { lineNumber: 1, text: "Error: Boom", kind: "header" },
      {
        lineNumber: 2,
        text: "    at Component (file.tsx:10:5)",
        kind: "stack",
      },
    ])
  })
})
