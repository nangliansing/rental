import type { ReactNode } from "react"
import { createRef } from "react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ClientRequest } from "@/features/client-request/api"

import { ClientRequestDrawerPanel } from "./ClientRequestDrawerPanel"

const mockUseSearchOwnerClientRequests = vi.hoisted(() => vi.fn())

vi.mock("@/features/client-request/api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/client-request/api")>()

  return {
    ...actual,
    useSearchOwnerClientRequests: mockUseSearchOwnerClientRequests,
    useUpdateOwnerClientRequestStatus: () => ({
      mutate: vi.fn(),
      isPending: false,
    }),
    useDeleteOwnerClientRequest: () => ({
      mutate: vi.fn(),
      isPending: false,
    }),
    useUpdateOwnerClientRequest: () => ({
      mutate: vi.fn(),
      isPending: false,
      error: null,
      reset: vi.fn(),
    }),
  }
})

vi.mock("@/shared/components/ModalPortal", () => ({
  ModalPortal: ({ children }: { children: ReactNode }) => (
    <div data-testid="modal-portal">{children}</div>
  ),
}))

vi.mock("@/shared/google-maps/readonly-map", () => ({
  ReadOnlyMap: () => <div data-testid="readonly-map" />,
  searchLinesGeometryToPaths: () => null,
}))

vi.mock("./ClientRequestMatchingBuildingsSection", () => ({
  ClientRequestMatchingBuildingsSection: () => (
    <div data-testid="matching-buildings">Matching buildings</div>
  ),
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

function mockQuery(overrides: Record<string, unknown> = {}) {
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

describe("ClientRequestDrawerPanel", () => {
  beforeEach(() => {
    mockQuery()
  })

  it("lists waiting requests and opens detail modal on row select", async () => {
    const user = userEvent.setup()
    const request = makeClientRequest()
    mockQuery({ data: { pages: [{ data: [request] }] } })
    const scrollRootRef = createRef<HTMLDivElement>()

    render(
      <div ref={scrollRootRef}>
        <ClientRequestDrawerPanel scrollRootRef={scrollRootRef} />
      </div>,
    )

    expect(mockUseSearchOwnerClientRequests).toHaveBeenCalledWith({
      status: "Waiting",
      enabled: true,
    })

    await user.click(screen.getByRole("button", { name: /Sukhumvit 2BR/i }))

    const dialog = await screen.findByRole("dialog", { name: "Sukhumvit 2BR" })
    expect(
      within(dialog).getByRole("heading", { name: "Sukhumvit 2BR" }),
    ).toBeInTheDocument()
    expect(within(dialog).getByText("Saved search")).toBeInTheDocument()
  })

  it("does not add page scroll padding in drawer layout", () => {
    mockQuery({ data: { pages: [{ data: [makeClientRequest()] }] } })
    const scrollRootRef = createRef<HTMLDivElement>()

    render(<ClientRequestDrawerPanel scrollRootRef={scrollRootRef} />)

    expect(
      screen.getByTestId("client-request-list-scroller").className,
    ).not.toContain("pb-20")
  })

  it("closes the detail modal from the header button", async () => {
    const user = userEvent.setup()
    mockQuery({
      data: { pages: [{ data: [makeClientRequest()] }] },
    })
    const scrollRootRef = createRef<HTMLDivElement>()

    render(<ClientRequestDrawerPanel scrollRootRef={scrollRootRef} />)

    await user.click(screen.getByRole("button", { name: /Sukhumvit 2BR/i }))
    expect(
      await screen.findByRole("dialog", { name: "Sukhumvit 2BR" }),
    ).toBeInTheDocument()

    await user.click(
      screen.getAllByRole("button", {
        name: "Close saved search details",
      })[0]!,
    )

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })
})
