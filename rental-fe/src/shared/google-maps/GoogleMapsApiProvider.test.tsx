import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { GoogleMapsApiProvider, useGoogleMapsApiScope } from "./GoogleMapsApiProvider"

const apiProviderMock = vi.fn(({ children }: { children: React.ReactNode }) => (
  <div data-testid="api-provider">{children}</div>
))

vi.mock("@vis.gl/react-google-maps", () => ({
  APIProvider: (props: { children: React.ReactNode }) => apiProviderMock(props),
}))

function ScopeProbe() {
  return (
    <span data-testid="scope-probe">
      {useGoogleMapsApiScope() ? "scoped" : "unscoped"}
    </span>
  )
}

describe("GoogleMapsApiProvider", () => {
  it("mounts a single API provider when no parent scope exists", () => {
    apiProviderMock.mockClear()

    render(
      <GoogleMapsApiProvider>
        <ScopeProbe />
      </GoogleMapsApiProvider>,
    )

    expect(screen.getByTestId("api-provider")).toBeInTheDocument()
    expect(screen.getByTestId("scope-probe")).toHaveTextContent("scoped")
    expect(apiProviderMock).toHaveBeenCalledOnce()
  })

  it("reuses an existing parent scope without nesting another provider", () => {
    apiProviderMock.mockClear()

    render(
      <GoogleMapsApiProvider>
        <GoogleMapsApiProvider>
          <ScopeProbe />
        </GoogleMapsApiProvider>
      </GoogleMapsApiProvider>,
    )

    expect(screen.getByTestId("scope-probe")).toHaveTextContent("scoped")
    expect(apiProviderMock).toHaveBeenCalledOnce()
  })
})
