import type { Page, Route } from "@playwright/test"

import { smokeAgentProfile } from "./authenticated-session"
import { installMapSearchApiMocks } from "./map-search-routes"

const DEFAULT_MAP_SEARCH_FILTERS = {
  minRent: 1000,
  maxRent: 8000,
  isForeignerAccepted: true,
}

function jsonRoute(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  }
}

export function buildListerMapSearchSmokeUrl(agentProfileId: string) {
  const trimmedId = agentProfileId.trim()
  const filters = JSON.stringify({
    ...DEFAULT_MAP_SEARCH_FILTERS,
    agentProfileIds: [trimmedId],
  })

  return `/?filters=${encodeURIComponent(filters)}`
}

export const listerMapSearchUrl = buildListerMapSearchSmokeUrl(
  smokeAgentProfile._id,
)

export type ListerMapSearchMockOptions = {
  agentProfileId?: string
  onAgentProfileRequest?: () => void
}

export async function installListerMapSearchAgentRoute(
  page: Page,
  options: ListerMapSearchMockOptions = {},
) {
  const agentProfileId = options.agentProfileId ?? smokeAgentProfile._id

  await page.route(
    `**/api/v1/search/agents/${agentProfileId}`,
    async (route: Route) => {
      if (route.request().method() !== "GET") {
        await route.continue()
        return
      }

      options.onAgentProfileRequest?.()

      await route.fulfill(
        jsonRoute({
          success: true,
          data: {
            agentProfile: {
              ...smokeAgentProfile,
              _id: agentProfileId,
            },
          },
        }),
      )
    },
  )
}

export async function installListerMapSearchMocks(
  page: Page,
  options: ListerMapSearchMockOptions = {},
) {
  await installMapSearchApiMocks(page)
  await installListerMapSearchAgentRoute(page, options)
}
