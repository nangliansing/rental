import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CopyListingLinkButton } from "./CopyListingLinkButton"

vi.mock("@/shared/utils/clipboard", () => ({
  copyTextToClipboard: vi.fn(),
}))

import { copyTextToClipboard } from "@/shared/utils/clipboard"

const mockedCopy = vi.mocked(copyTextToClipboard)

describe("CopyListingLinkButton", () => {
  beforeEach(() => {
    mockedCopy.mockReset()
    mockedCopy.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders nothing for blank listing ids", () => {
    const { container } = render(<CopyListingLinkButton listingId="   " />)
    expect(container).toBeEmptyDOMElement()
  })

  it("copies the public listing URL and shows feedback", async () => {
    render(<CopyListingLinkButton listingId="listing-1" />)

    const button = screen.getByRole("button", { name: "Copy listing link" })
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockedCopy).toHaveBeenCalledWith(
        `${window.location.origin}/listings/listing-1`,
      )
    })

    expect(
      await screen.findByRole("button", { name: "Link copied" }),
    ).toBeInTheDocument()
  })

  it("stops click propagation so parent activators do not fire", async () => {
    const onParentClick = vi.fn()

    render(
      <div onClick={onParentClick}>
        <CopyListingLinkButton listingId="listing-1" />
      </div>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Copy listing link" }))

    await waitFor(() => {
      expect(mockedCopy).toHaveBeenCalledOnce()
    })
    expect(onParentClick).not.toHaveBeenCalled()
  })

  it("keeps idle label when clipboard fails", async () => {
    mockedCopy.mockRejectedValueOnce(new Error("blocked"))

    render(<CopyListingLinkButton listingId="listing-1" />)

    fireEvent.click(screen.getByRole("button", { name: "Copy listing link" }))

    expect(
      await screen.findByRole("button", { name: "Could not copy link" }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Link copied" }),
    ).not.toBeInTheDocument()
  })
})
