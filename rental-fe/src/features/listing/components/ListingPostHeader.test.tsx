import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ListingPostHeader } from "./ListingPostHeader"

const baseProps = {
  agent: null,
  updatedAt: "2026-07-21T00:00:00.000Z",
  isPrivate: false,
  isOwnListing: false,
  canReportListing: false,
  listingUrl: "https://example.com/listings/one",
  editHref: "/listings/one/edit",
  onDeleteRequest: vi.fn(),
  onReportRequest: vi.fn(),
}

afterEach(() => vi.restoreAllMocks())

describe("ListingPostHeader", () => {
  it("shows safe lister fallback and hides unauthorized actions", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ListingPostHeader {...baseProps} />
      </MemoryRouter>,
    )

    expect(screen.getByText("Lister")).toBeInTheDocument()
    await user.click(screen.getByLabelText("Listing options"))
    expect(screen.queryByText("Report listing")).not.toBeInTheDocument()
    expect(screen.queryByText("Edit the listing")).not.toBeInTheDocument()
    expect(screen.queryByText("Edit privacy")).not.toBeInTheDocument()
    expect(screen.queryByText("Delete listing")).not.toBeInTheDocument()
    expect(screen.queryByText("List in this building")).not.toBeInTheDocument()
    expect(screen.queryByText("View lister reviews")).not.toBeInTheDocument()
  })

  it("exposes owner actions and handles an unavailable clipboard", async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(
      new Error("Clipboard unavailable"),
    )
    const onDeleteRequest = vi.fn()
    const onPrivacyRequest = vi.fn()
    render(
      <MemoryRouter>
        <ListingPostHeader
          {...baseProps}
          isPrivate
          isOwnListing
          canReportListing
          onDeleteRequest={onDeleteRequest}
          onPrivacyRequest={onPrivacyRequest}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText("Private")).toBeInTheDocument()
    await user.click(screen.getByLabelText("Listing options"))
    expect(screen.queryByText("List in this building")).not.toBeInTheDocument()
    expect(screen.queryByText("View lister reviews")).not.toBeInTheDocument()
    expect(screen.getByText("Report listing")).toBeInTheDocument()
    expect(screen.getByText("Edit the listing")).toBeInTheDocument()
    expect(screen.getByText("Edit privacy")).toBeInTheDocument()

    await user.click(screen.getByText("Edit privacy"))
    expect(onPrivacyRequest).toHaveBeenCalledOnce()

    await user.click(screen.getByLabelText("Listing options"))
    await user.click(screen.getByText("Copy this link"))
    expect(await screen.findByText("Could not copy")).toBeInTheDocument()

    await user.click(screen.getByLabelText("Listing options"))
    await user.click(screen.getByText("Delete listing"))
    expect(onDeleteRequest).toHaveBeenCalledOnce()
  })
})
