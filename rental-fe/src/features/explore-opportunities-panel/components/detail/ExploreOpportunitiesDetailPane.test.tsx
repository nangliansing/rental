import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AgentDemandOpportunity } from "@/features/agent-demand-opportunity/api"
import { ApiError } from "@/lib/api-client"

import { ExploreOpportunitiesPanelProvider } from "../../context/ExploreOpportunitiesPanelProvider"
import { ExploreOpportunitiesSelectionContext } from "../../context/ExploreOpportunitiesSelectionContext"
import { ExploreOpportunitiesDetailPane } from "./ExploreOpportunitiesDetailPane"

const useAgentDemandOpportunityById = vi.hoisted(() => vi.fn())

vi.mock("@/features/agent-demand-opportunity/api", async importOriginal => {
  const actual =
    await importOriginal<
      typeof import("@/features/agent-demand-opportunity/api")
    >()

  return {
    ...actual,
    useAgentDemandOpportunityById,
  }
})

vi.mock("@/features/saved-search/components/SavedSearchDetailBody", () => ({
  SavedSearchDetailBody: ({ id }: { id: string }) => (
    <div data-testid="shared-detail-body">Body for {id}</div>
  ),
}))

const sampleOpportunity: AgentDemandOpportunity = {
  _id: "opportunity-1",
  status: "Waiting",
  geoSearch: {
    mode: "area",
    placeName: "Siam",
  },
  filters: { bedroomCount: 1 },
  createdAt: "2026-08-04T07:30:00.000Z",
  updatedAt: "2026-08-06T07:30:00.000Z",
  lastConfirmedAt: "2026-08-04T07:30:00.000Z",
  myMatchingBuildingCount: 0,
  platformMatchingBuildingCount: 1,
  matchingBuildingCountCapped: false,
  opportunityRanking: null,
}

function renderDetail({
  selectedOpportunityId,
  children = <ExploreOpportunitiesDetailPane />,
}: {
  selectedOpportunityId: string | null
  children?: ReactNode
}) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {selectedOpportunityId == null ? (
        <ExploreOpportunitiesPanelProvider
          isOpen
          onClose={() => undefined}
          area={{
            type: "Point",
            coordinates: [100.5, 13.7],
            coverageMeters: 1000,
          }}
        >
          {children}
        </ExploreOpportunitiesPanelProvider>
      ) : (
        <ExploreOpportunitiesSelectionContext.Provider
          value={{
            matchTab: "unmatched",
            setMatchTab: () => undefined,
            selectedOpportunityId,
            mobilePage: "detail",
            selectOpportunity: () => undefined,
            clearSelection: () => undefined,
            showListPage: () => undefined,
          }}
        >
          {children}
        </ExploreOpportunitiesSelectionContext.Provider>
      )}
    </QueryClientProvider>,
  )
}

describe("ExploreOpportunitiesDetailPane", () => {
  beforeEach(() => {
    useAgentDemandOpportunityById.mockReset()
  })

  it("shows the empty state when nothing is selected", () => {
    useAgentDemandOpportunityById.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    })

    renderDetail({ selectedOpportunityId: null })

    expect(
      screen.getByRole("heading", { name: "Select an opportunity" }),
    ).toBeInTheDocument()
    expect(useAgentDemandOpportunityById).toHaveBeenCalledWith({
      opportunityId: undefined,
      enabled: false,
    })
  })

  it("loads and renders the shared detail body for a selected opportunity", () => {
    useAgentDemandOpportunityById.mockReturnValue({
      data: sampleOpportunity,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    })

    renderDetail({ selectedOpportunityId: "opportunity-1" })

    expect(screen.getByRole("heading", { name: "Siam" })).toBeInTheDocument()
    expect(screen.getByText("Active")).toBeInTheDocument()
    expect(screen.getByTestId("shared-detail-body")).toHaveTextContent(
      "Body for opportunity-1",
    )
    expect(useAgentDemandOpportunityById).toHaveBeenCalledWith({
      opportunityId: "opportunity-1",
      enabled: true,
    })
  })

  it("shows loading and error states with retry", async () => {
    const user = userEvent.setup()

    useAgentDemandOpportunityById.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: true,
    })

    const { rerender } = renderDetail({
      selectedOpportunityId: "opportunity-1",
    })

    expect(screen.getByText("Loading opportunity…")).toBeInTheDocument()

    const refetch = vi.fn()
    useAgentDemandOpportunityById.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new ApiError(
        "Agent demand opportunity not found",
        404,
        "AGENT_DEMAND_OPPORTUNITY_NOT_FOUND",
      ),
      refetch,
      isFetching: false,
    })

    rerender(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <ExploreOpportunitiesSelectionContext.Provider
          value={{
            matchTab: "unmatched",
            setMatchTab: () => undefined,
            selectedOpportunityId: "opportunity-1",
            mobilePage: "detail",
            selectOpportunity: () => undefined,
            clearSelection: () => undefined,
            showListPage: () => undefined,
          }}
        >
          <ExploreOpportunitiesDetailPane />
        </ExploreOpportunitiesSelectionContext.Provider>
      </QueryClientProvider>,
    )

    expect(
      screen.getByRole("heading", { name: "Could not load opportunity" }),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Agent demand opportunity not found"),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Try again" }))
    expect(refetch).toHaveBeenCalled()
  })
})
