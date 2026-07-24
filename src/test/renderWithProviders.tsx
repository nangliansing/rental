import {
  QueryClient,
  QueryClientProvider,
  type QueryClientConfig,
} from "@tanstack/react-query"
import {
  render,
  type RenderOptions,
  type RenderResult,
} from "@testing-library/react"
import userEvent, { type UserEvent } from "@testing-library/user-event"
import type { PropsWithChildren, ReactElement } from "react"
import { MemoryRouter } from "react-router-dom"

type RenderWithProvidersOptions = Omit<RenderOptions, "wrapper"> & {
  initialEntries?: string[]
  queryClient?: QueryClient
}

type RenderWithProvidersResult = RenderResult & {
  queryClient: QueryClient
  user: UserEvent
}

const TEST_QUERY_CLIENT_CONFIG: QueryClientConfig = {
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
}

export function createTestQueryClient() {
  return new QueryClient(TEST_QUERY_CLIENT_CONFIG)
}

export function renderWithProviders(
  ui: ReactElement,
  {
    initialEntries = ["/"],
    queryClient = createTestQueryClient(),
    ...renderOptions
  }: RenderWithProvidersOptions = {},
): RenderWithProvidersResult {
  function Providers({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  return {
    ...render(ui, { wrapper: Providers, ...renderOptions }),
    queryClient,
    user: userEvent.setup(),
  }
}
