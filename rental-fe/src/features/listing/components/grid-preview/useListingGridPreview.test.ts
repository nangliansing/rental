import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { createSearchListing } from "@/test/fixtures/listings"

import { useListingGridPreview } from "./useListingGridPreview"

describe("useListingGridPreview", () => {
  it("opens and closes preview state", () => {
    const listing = createSearchListing()
    const { result } = renderHook(() => useListingGridPreview())

    expect(result.current.isPreviewOpen).toBe(false)
    expect(result.current.previewListing).toBeNull()

    act(() => {
      result.current.openPreview(listing)
    })

    expect(result.current.isPreviewOpen).toBe(true)
    expect(result.current.previewListing).toEqual(listing)

    act(() => {
      result.current.closePreview()
    })

    expect(result.current.isPreviewOpen).toBe(false)
    expect(result.current.previewListing).toBeNull()
  })

  it("ignores listings without a valid id", () => {
    const { result } = renderHook(() => useListingGridPreview())

    act(() => {
      result.current.openPreview(createSearchListing({ _id: "   " as never }))
    })

    expect(result.current.isPreviewOpen).toBe(false)
    expect(result.current.previewListing).toBeNull()
  })

  it("sets handoff history sync when closing preview for detail", () => {
    const listing = createSearchListing()
    const { result } = renderHook(() => useListingGridPreview())

    act(() => {
      result.current.openPreview(listing)
    })

    act(() => {
      result.current.closePreview({ handoffToDetail: true })
    })

    expect(result.current.skipHistorySyncOnCloseRef.current).toBe(true)
    expect(result.current.isPreviewOpen).toBe(false)
  })

  it("clears handoff history sync when opening a new preview", () => {
    const listing = createSearchListing()
    const { result } = renderHook(() => useListingGridPreview())

    act(() => {
      result.current.closePreview({ handoffToDetail: true })
    })
    expect(result.current.skipHistorySyncOnCloseRef.current).toBe(true)

    act(() => {
      result.current.openPreview(listing)
    })

    expect(result.current.skipHistorySyncOnCloseRef.current).toBe(false)
    expect(result.current.isPreviewOpen).toBe(true)
  })

  it("replaces the open listing when previewing another card", () => {
    const first = createSearchListing({ _id: "listing-1", rent: 14000 })
    const second = createSearchListing({ _id: "listing-2", rent: 15000 })
    const { result } = renderHook(() => useListingGridPreview())

    act(() => {
      result.current.openPreview(first)
    })
    expect(result.current.previewListing?._id).toBe("listing-1")

    act(() => {
      result.current.openPreview(second)
    })
    expect(result.current.previewListing?._id).toBe("listing-2")
    expect(result.current.isPreviewOpen).toBe(true)
  })
})
