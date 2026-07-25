import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import {
  StandalonePageBackProvider,
  useStandalonePageBack,
} from "./StandalonePageBackContext"
import { StandalonePageHeader } from "./StandalonePageHeader"

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}))

vi.mock("@/features/profile/api", () => ({
  useMyAgentProfile: () => ({ data: undefined }),
}))

function BackHandlerProbe({ onBack }: { onBack: () => void }) {
  useStandalonePageBack(onBack)

  return <div>Page content</div>
}

describe("StandalonePageBackContext", () => {
  it("stores the back handler without invoking it on registration", async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()

    render(
      <MemoryRouter>
        <StandalonePageBackProvider>
          <StandalonePageHeader />
          <BackHandlerProbe onBack={onBack} />
        </StandalonePageBackProvider>
      </MemoryRouter>,
    )

    expect(onBack).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Go back" }))

    expect(onBack).toHaveBeenCalledOnce()
  })
})
