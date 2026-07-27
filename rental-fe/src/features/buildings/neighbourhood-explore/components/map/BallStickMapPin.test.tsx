import { render, screen } from "@testing-library/react"
import { Bus } from "lucide-react"
import { describe, expect, it } from "vitest"

import { BallStickMapPin } from "./BallStickMapPin"

describe("BallStickMapPin", () => {
  it("inverts light-variant colors when selected", () => {
    const { rerender } = render(
      <BallStickMapPin
        color="#2563EB"
        ballSize={32}
        variant="light"
        isSelected={false}
      >
        <Bus aria-hidden="true" data-testid="pin-icon" />
      </BallStickMapPin>,
    )

    const ball = screen.getByTestId("pin-icon").parentElement

    expect(ball).toHaveStyle({
      backgroundColor: "rgb(255, 255, 255)",
      borderColor: "rgb(37, 99, 235)",
    })

    rerender(
      <BallStickMapPin
        color="#2563EB"
        ballSize={32}
        variant="light"
        isSelected
      >
        <Bus aria-hidden="true" data-testid="pin-icon" />
      </BallStickMapPin>,
    )

    expect(ball).toHaveStyle({
      backgroundColor: "rgb(37, 99, 235)",
      borderColor: "rgb(37, 99, 235)",
    })
    expect(ball?.style.boxShadow).toContain("#2563EB")
    expect(ball?.style.boxShadow).toContain("#ffffff")
  })
})
