import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ClientRequest } from "@/features/client-request/api"

import { ClientRequestWorkspace } from "./ClientRequestWorkspace"

const mockUseSearchOwnerClientRequests = vi.hoisted(() => vi.fn())
const mockUseMediaQuery = vi.hoisted(() => vi.fn())

vi.mock("@/features/client-request/api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/client-request/api")>()

  return {
    ...actual,
    useSearchOwnerClientRequests: mockUseSearchOwnerClientRequests,
  }
})

vi.mock("@/hooks/useMediaQuery", () => ({
  useMediaQuery: mockUseMediaQuery,
}))

function makeClientRequest(
  overrides: Partial<ClientRequest> = {},
): ClientRequest {
  return {
    _id: "cr-1",
    createdBy: "user-1",
    name: "Sukhumvit 2BR",
    description: "Near BTS",
    status: "Waiting",
    geoSearch: {
      mode: "area",
      placeName: "Phrom Phong",
    },
    filters: {},
    isDeleted: false,
    deletedAt: null,
    createdAt: "2026-08-03T18:00:00.000Z",
    updatedAt: "2026-08-03T18:00:00.000Z",
    ...overrides,
  }
}

function mockQuery(
  overrides: Record<string, unknown> = {},
) {
  mockUseSearchOwnerClientRequests.mockReturnValue({
    isPending: false,
    error: null,
    data: { pages: [] },
    hasNextPage: false,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    refetch: vi.fn(),
    fetchNextPage: vi.fn(),
    ...overrides,
  })
}

describe("ClientRequestWorkspace", () => {
  beforeEach(() => {
    mockUseMediaQuery.mockReturnValue(true)
    mockQuery()
  })

  it("shows a loading state while the first page is pending", () => {
    mockQuery({ isPending: true })

    render(<ClientRequestWorkspace />)

    expect(screen.getByText("Loading client requests...")).toBeInTheDocument()
  })

  it("shows an empty state when there are no requests", () => {
    mockQuery({ data: { pages: [{ data: [] }] } })

    render(<ClientRequestWorkspace />)

    expect(
      screen.getByRole("heading", { name: "No waiting requests" }),
    ).toBeInTheDocument()
  })

  it("queries Waiting by default and Closed after switching tabs", async () => {
    const user = userEvent.setup()
    mockQuery({ data: { pages: [{ data: [] }] } })

    render(<ClientRequestWorkspace />)

    expect(mockUseSearchOwnerClientRequests).toHaveBeenCalledWith({
      status: "Waiting",
    })

    const statusTabs = screen.getByRole("tablist", {
      name: "Client request status",
    })
    await user.click(within(statusTabs).getByRole("button", { name: "Closed" }))

    expect(mockUseSearchOwnerClientRequests).toHaveBeenLastCalledWith({
      status: "Closed",
    })
    expect(
      screen.getByRole("heading", { name: "No closed requests" }),
    ).toBeInTheDocument()
  })

  it("clears selection when switching status tabs", async () => {
    const user = userEvent.setup()
    const request = makeClientRequest()
    mockQuery({
      data: { pages: [{ data: [request] }] },
    })
    mockUseMediaQuery.mockReturnValue(true)

    const { rerender } = render(<ClientRequestWorkspace />)

    await user.click(screen.getByRole("button", { name: /Sukhumvit 2BR/i }))
    expect(screen.getByTestId("client-request-raw-detail")).toBeInTheDocument()

    mockQuery({ data: { pages: [{ data: [] }] } })
    const statusTabs = screen.getByRole("tablist", {
      name: "Client request status",
    })
    await user.click(within(statusTabs).getByRole("button", { name: "Closed" }))
    rerender(<ClientRequestWorkspace />)

    expect(
      screen.queryByTestId("client-request-raw-detail"),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Select a client request" }),
    ).toBeInTheDocument()
  })

  it("shows a retry affordance when the initial query fails", () => {
    const refetch = vi.fn()
    mockQuery({
      error: new Error("Network down"),
      refetch,
    })

    render(<ClientRequestWorkspace />)

    expect(screen.getByText("Network down")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument()
  })

  it("selects a row and shows raw detail on desktop without opening a modal", async () => {
    const user = userEvent.setup()
    const request = makeClientRequest()
    mockQuery({
      data: { pages: [{ data: [request] }] },
    })
    mockUseMediaQuery.mockReturnValue(true)

    render(<ClientRequestWorkspace />)

    await user.click(screen.getByRole("button", { name: /Sukhumvit 2BR/i }))

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.getByTestId("client-request-raw-detail")).toHaveTextContent(
      '"_id": "cr-1"',
    )
  })

  it("opens a full-screen modal on mobile and keeps the list mounted", async () => {
    const user = userEvent.setup()
    const request = makeClientRequest()
    mockQuery({
      data: { pages: [{ data: [request] }] },
    })
    mockUseMediaQuery.mockReturnValue(false)

    render(<ClientRequestWorkspace />)

    expect(screen.getByTestId("client-request-list-scroller")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /Sukhumvit 2BR/i }))

    const dialog = screen.getByRole("dialog", { name: "Sukhumvit 2BR" })
    expect(
      within(dialog).getByTestId("client-request-raw-detail"),
    ).toBeInTheDocument()
    expect(screen.getByTestId("client-request-list-scroller")).toBeInTheDocument()

    await user.click(
      screen.getByRole("button", { name: "Close client request details" }),
    )

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.getByTestId("client-request-list-scroller")).toBeInTheDocument()
  })

  it("shows the desktop placeholder when nothing is selected", () => {
    mockQuery({
      data: { pages: [{ data: [makeClientRequest()] }] },
    })
    mockUseMediaQuery.mockReturnValue(true)

    render(<ClientRequestWorkspace />)

    expect(
      screen.getByRole("heading", { name: "Select a client request" }),
    ).toBeInTheDocument()
  })

  it("adds mobile nav clearance padding on the list scroller", () => {
    mockQuery({ data: { pages: [{ data: [] }] } })

    render(<ClientRequestWorkspace />)

    expect(screen.getByTestId("client-request-list-scroller").className).toContain(
      "pb-20",
    )
    expect(screen.getByTestId("client-request-list-scroller").className).toContain(
      "md:pb-0",
    )
  })
})
