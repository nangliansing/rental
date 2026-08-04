import type { ComponentProps, ReactNode } from "react"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
  CLIENT_REQUEST_WIZARD_DIALOG_CONTENT_CLASSNAME,
  ClientRequestWizardLayout,
} from "./ClientRequestWizardLayout"

vi.mock("@/shared/components/dialogs/DialogShell", () => ({
  DialogTitle: ({
    children,
    className,
  }: {
    children: ReactNode
    className?: string
  }) => (
    <h2 data-testid="dialog-title" className={className}>
      {children}
    </h2>
  ),
  DialogDescription: ({
    children,
    className,
  }: {
    children: ReactNode
    className?: string
  }) => (
    <p data-testid="dialog-description" className={className}>
      {children}
    </p>
  ),
}))

function renderLayout(
  overrides: Partial<ComponentProps<typeof ClientRequestWizardLayout>> = {},
) {
  const onClose = overrides.onClose ?? vi.fn()

  const result = render(
    <ClientRequestWizardLayout
      step={1}
      title="Create client request"
      description="Confirm the search area, then name the request."
      onClose={onClose}
      {...overrides}
    >
      {overrides.children ?? <div data-testid="wizard-body">Body content</div>}
    </ClientRequestWizardLayout>,
  )

  return { ...result, onClose }
}

describe("ClientRequestWizardLayout", () => {
  describe("content & chrome", () => {
    it("renders children below the form header", () => {
      renderLayout()

      expect(screen.getByTestId("wizard-body")).toHaveTextContent(
        "Body content",
      )
      expect(
        screen.getByRole("heading", { name: "Create client request" }),
      ).toBeInTheDocument()
      expect(
        screen.getByText("Confirm the search area, then name the request."),
      ).toBeInTheDocument()
    })

    it("merges a custom className onto the root layout", () => {
      const { container } = renderLayout({ className: "custom-wizard" })

      expect(container.firstElementChild).toHaveClass(
        "relative",
        "flex",
        "custom-wizard",
      )
    })

    it("exports dialog content classes for full-screen mobile / card desktop", () => {
      expect(CLIENT_REQUEST_WIZARD_DIALOG_CONTENT_CLASSNAME).toContain("h-dvh")
      expect(CLIENT_REQUEST_WIZARD_DIALOG_CONTENT_CLASSNAME).toContain(
        "rounded-none",
      )
      expect(CLIENT_REQUEST_WIZARD_DIALOG_CONTENT_CLASSNAME).toContain(
        "sm:rounded-2xl",
      )
      expect(CLIENT_REQUEST_WIZARD_DIALOG_CONTENT_CLASSNAME).toContain(
        "sm:max-w-lg",
      )
    })
  })

  describe("step indicator", () => {
    it("announces step 1 of 2", () => {
      renderLayout({ step: 1 })

      expect(
        screen.getByRole("status", { name: "Step 1 of 2" }),
      ).toBeInTheDocument()
    })

    it("announces step 2 of 2", () => {
      renderLayout({ step: 2 })

      expect(
        screen.getByRole("status", { name: "Step 2 of 2" }),
      ).toBeInTheDocument()
    })
  })

  describe("header semantics", () => {
    it("defaults to page heading elements for create / edit routes", () => {
      renderLayout()

      expect(screen.queryByTestId("dialog-title")).not.toBeInTheDocument()
      expect(screen.queryByTestId("dialog-description")).not.toBeInTheDocument()
      expect(
        screen.getByRole("heading", { level: 2, name: "Create client request" }),
      ).toBeInTheDocument()
    })

    it("uses dialog title / description semantics when requested", () => {
      renderLayout({
        headerSemantics: "dialog",
        title: "Client preferences",
        description: "Optional filters used to match listings.",
      })

      expect(screen.getByTestId("dialog-title")).toHaveTextContent(
        "Client preferences",
      )
      expect(screen.getByTestId("dialog-description")).toHaveTextContent(
        "Optional filters used to match listings.",
      )
    })
  })

  describe("hero vs no-hero layout", () => {
    it("renders the hero and places overlays inside the hero panel", () => {
      renderLayout({
        hero: <div data-testid="map-hero">Map preview</div>,
      })

      const hero = screen.getByTestId("map-hero")
      expect(hero).toBeInTheDocument()
      expect(screen.queryByText("Map preview")).toBeInTheDocument()

      const heroPanel = hero.parentElement
      expect(heroPanel).not.toBeNull()
      expect(
        within(heroPanel as HTMLElement).getByRole("status", {
          name: "Step 1 of 2",
        }),
      ).toBeInTheDocument()
      expect(
        within(heroPanel as HTMLElement).getByRole("button", {
          name: "Close",
        }),
      ).toBeInTheDocument()

      expect(
        document.querySelector('[aria-hidden="true"].h-12'),
      ).not.toBeInTheDocument()
    })

    it("renders a top spacer instead of a hero when none is provided", () => {
      renderLayout()

      expect(screen.queryByTestId("map-hero")).not.toBeInTheDocument()
      expect(
        document.querySelector('[aria-hidden="true"].h-12'),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("status", { name: "Step 1 of 2" }),
      ).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument()
    })

    it("treats null and undefined hero as no-hero layout", () => {
      const { rerender, onClose } = renderLayout({ hero: null })

      expect(
        document.querySelector('[aria-hidden="true"].h-12'),
      ).toBeInTheDocument()

      rerender(
        <ClientRequestWizardLayout
          step={1}
          title="Create client request"
          description="Confirm the search area, then name the request."
          onClose={onClose}
          hero={undefined}
        >
          <div data-testid="wizard-body">Body content</div>
        </ClientRequestWizardLayout>,
      )

      expect(
        document.querySelector('[aria-hidden="true"].h-12'),
      ).toBeInTheDocument()
    })
  })

  describe("close control", () => {
    it("calls onClose when the close button is clicked", () => {
      const { onClose } = renderLayout()

      fireEvent.click(screen.getByRole("button", { name: "Close" }))

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("uses a custom close aria-label when provided", () => {
      const { onClose } = renderLayout({
        closeAriaLabel: "Close create client request",
      })

      fireEvent.click(
        screen.getByRole("button", { name: "Close create client request" }),
      )

      expect(onClose).toHaveBeenCalledTimes(1)
      expect(
        screen.queryByRole("button", { name: "Close" }),
      ).not.toBeInTheDocument()
    })

    it("disables the close button and does not call onClose while submitting", () => {
      const { onClose } = renderLayout({ closeDisabled: true })

      const closeButton = screen.getByRole("button", { name: "Close" })
      expect(closeButton).toBeDisabled()

      fireEvent.click(closeButton)

      expect(onClose).not.toHaveBeenCalled()
    })

    it("keeps close reachable on both hero and no-hero layouts", () => {
      const onClose = vi.fn()
      const { rerender } = renderLayout({
        onClose,
        hero: <div data-testid="map-hero">Map</div>,
      })

      fireEvent.click(screen.getByRole("button", { name: "Close" }))
      expect(onClose).toHaveBeenCalledTimes(1)

      rerender(
        <ClientRequestWizardLayout
          step={2}
          title="Client preferences"
          description="Optional filters."
          onClose={onClose}
        >
          <div>Preferences</div>
        </ClientRequestWizardLayout>,
      )

      fireEvent.click(screen.getByRole("button", { name: "Close" }))
      expect(onClose).toHaveBeenCalledTimes(2)
    })

    it("uses type=button so close never submits a nested form", () => {
      renderLayout()

      expect(screen.getByRole("button", { name: "Close" })).toHaveAttribute(
        "type",
        "button",
      )
    })
  })

  describe("step transitions", () => {
    it("moves from hero step 1 to spacer step 2 like the create modal", () => {
      const onClose = vi.fn()
      const { rerender } = renderLayout({
        step: 1,
        onClose,
        hero: <div data-testid="map-hero">Map preview</div>,
        title: "Create client request",
        description: "Confirm the search area, then name the request.",
      })

      expect(screen.getByTestId("map-hero")).toBeInTheDocument()
      expect(
        screen.getByRole("status", { name: "Step 1 of 2" }),
      ).toBeInTheDocument()
      expect(
        document.querySelector('[aria-hidden="true"].h-12'),
      ).not.toBeInTheDocument()

      rerender(
        <ClientRequestWizardLayout
          step={2}
          title="Client preferences"
          description="Optional filters used to match listings for this client."
          onClose={onClose}
          headerSemantics="dialog"
        >
          <div data-testid="preferences-body">Preferences</div>
        </ClientRequestWizardLayout>,
      )

      expect(screen.queryByTestId("map-hero")).not.toBeInTheDocument()
      expect(
        screen.getByRole("status", { name: "Step 2 of 2" }),
      ).toBeInTheDocument()
      expect(
        document.querySelector('[aria-hidden="true"].h-12'),
      ).toBeInTheDocument()
      expect(screen.getByTestId("preferences-body")).toBeInTheDocument()
      expect(screen.getByTestId("dialog-title")).toHaveTextContent(
        "Client preferences",
      )
    })
  })

  describe("overlay layering", () => {
    it("keeps the step-dot badge non-interactive so close remains clickable", () => {
      renderLayout({
        hero: <div data-testid="map-hero">Map</div>,
      })

      const dots = screen.getByRole("status", { name: "Step 1 of 2" })
      expect(dots).toHaveClass("pointer-events-none")
      expect(dots.parentElement).toHaveClass("pointer-events-none")
      expect(screen.getByRole("button", { name: "Close" })).not.toBeDisabled()
    })
  })
})
