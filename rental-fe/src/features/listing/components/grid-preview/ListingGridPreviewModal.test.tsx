import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  createSearchBuilding,
  createSearchListing,
} from "@/test/fixtures/listings"

import { ListingGridPreviewModal } from "./ListingGridPreviewModal"

describe("ListingGridPreviewModal", () => {
  afterEach(() => {
    vi.useRealTimers()
    document.body.style.overflow = ""
  })

  it("closes from the backdrop and opens detail from the preview content in modal mode", async () => {
    const user = userEvent.setup()
    const listing = {
      ...createSearchListing(),
      building: createSearchBuilding(),
    }
    const onClose = vi.fn()
    const onOpenDetail = vi.fn()

    render(
      <ListingGridPreviewModal
        listing={listing}
        onClose={onClose}
        detailMode={{ mode: "modal", onOpenDetail }}
      />,
    )

    expect(
      screen.getByRole("dialog", { name: "Preview listing ฿14k" }),
    ).toBeInTheDocument()
    expect(screen.queryByText("Flexible")).not.toBeInTheDocument()
    expect(screen.getByText(/^Dep /)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Copy listing link" }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole("button", {
        name: "Preview listing ฿14k. Tap for full details.",
      }),
    )

    expect(onOpenDetail).toHaveBeenCalledWith("listing-1")

    onClose.mockClear()

    const backdrop = screen.getByRole("dialog").parentElement
    expect(backdrop).not.toBeNull()
    await user.click(backdrop!)

    expect(onClose).toHaveBeenCalledOnce()
  })

  it("does not open detail when the copy link control is clicked", async () => {
    const user = userEvent.setup()
    const onOpenDetail = vi.fn()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    })

    render(
      <ListingGridPreviewModal
        listing={createSearchListing()}
        onClose={vi.fn()}
        detailMode={{ mode: "modal", onOpenDetail }}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Copy listing link" }))

    expect(onOpenDetail).not.toHaveBeenCalled()
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/listings/listing-1`,
    )
  })

  it("renders nothing when listing is null", () => {
    const { container } = render(
      <ListingGridPreviewModal
        listing={null}
        onClose={vi.fn()}
        detailMode={{ mode: "modal", onOpenDetail: vi.fn() }}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("closes from Escape", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <ListingGridPreviewModal
        listing={createSearchListing()}
        onClose={onClose}
        detailMode={{ mode: "modal", onOpenDetail: vi.fn() }}
      />,
    )

    await user.keyboard("{Escape}")

    expect(onClose).toHaveBeenCalledOnce()
  })

  it("uses compact availability in the preview header", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

    render(
      <ListingGridPreviewModal
        listing={createSearchListing({
          availableAt: "2026-08-15T00:00:00+07:00",
        })}
        onClose={vi.fn()}
        detailMode={{ mode: "modal", onOpenDetail: vi.fn() }}
      />,
    )

    expect(screen.getByText("Aug 15")).toBeInTheDocument()
    expect(screen.queryByText("Aug 15, 2026")).not.toBeInTheDocument()
  })

  it("does not duplicate availability inside fine print", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

    render(
      <ListingGridPreviewModal
        listing={createSearchListing({
          availableAt: "2026-07-29T00:00:00+07:00",
        })}
        onClose={vi.fn()}
        detailMode={{ mode: "modal", onOpenDetail: vi.fn() }}
      />,
    )

    expect(screen.getByLabelText("Available now")).toBeInTheDocument()
    expect(screen.getByText(/^Dep /)).toBeInTheDocument()
    expect(screen.queryByText("Available from")).not.toBeInTheDocument()
  })

  it("does not call onOpenDetail in modal mode when listing id is blank", async () => {
    const user = userEvent.setup()
    const onOpenDetail = vi.fn()

    render(
      <ListingGridPreviewModal
        listing={createSearchListing({ _id: "   " as never })}
        onClose={vi.fn()}
        detailMode={{ mode: "modal", onOpenDetail }}
      />,
    )

    await user.click(
      screen.getByRole("button", {
        name: "Preview listing ฿14k. Tap for full details.",
      }),
    )

    expect(onOpenDetail).not.toHaveBeenCalled()
  })

  it("renders a detail link in link mode", async () => {
    const user = userEvent.setup()
    const onLinkActivate = vi.fn()
    const listing = createSearchListing()

    render(
      <MemoryRouter>
        <ListingGridPreviewModal
          listing={listing}
          onClose={vi.fn()}
          detailMode={{
            mode: "link",
            link: {
              to: "/listings/listing-1",
              state: { returnTo: "/buildings/building-1" },
            },
            onLinkActivate,
          }}
        />
      </MemoryRouter>,
    )

    expect(
      screen.queryByRole("button", {
        name: "Preview listing ฿14k. Tap for full details.",
      }),
    ).not.toBeInTheDocument()

    const detailLink = screen.getByRole("link", {
      name: "Preview listing ฿14k. Tap for full details.",
    })

    expect(detailLink).toHaveAttribute("href", "/listings/listing-1")

    await user.click(detailLink)

    expect(onLinkActivate).toHaveBeenCalledOnce()
  })
})
