import axe, { type ElementContext, type RunOptions } from "axe-core"
import { expect } from "vitest"

const JSDOM_AXE_OPTIONS: RunOptions = {
  rules: {
    "color-contrast": { enabled: false },
  },
}

export async function assertNoAccessibilityViolations(
  context: ElementContext = document.body,
) {
  const results = await axe.run(context, JSDOM_AXE_OPTIONS)
  const violations = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    targets: violation.nodes.flatMap((node) => node.target),
  }))

  expect(violations).toEqual([])
}
