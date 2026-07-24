import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { MonthlyCostAdvice } from "./MonthlyCostAdvice"

describe("MonthlyCostAdvice", () => {
  it("renders a concise estimated range for valid listing data", () => {
    render(
      <MonthlyCostAdvice rent={4000} electricRate={5} waterRate={20} />,
    )

    expect(
      screen.getByText(
        "Around ฿4,580–฿5,700/month with electricity and water.",
      ),
    ).toHaveClass("text-xs", "text-slate-400")
  })

  it("renders one amount when the estimate bounds are equal", () => {
    render(
      <MonthlyCostAdvice rent="4000" electricRate={0} waterRate={0} />,
    )

    expect(
      screen.getByText(
        "Around ฿4,000/month with electricity and water.",
      ),
    ).toBeInTheDocument()
  })

  it.each([
    { rent: "invalid" },
    { rent: 4000, electricRate: -1 },
    { rent: 4000, waterRate: "not-a-number" },
  ])("renders nothing for invalid cost data: %o", (props) => {
    const { container } = render(<MonthlyCostAdvice {...props} />)

    expect(container).toBeEmptyDOMElement()
  })
})
