import { cn } from "@/lib/utils"

import { formatMoney } from "../utils/listingDisplay"
import {
  calculateEstimatedMonthlyCost,
  type MonthlyCostEstimateInput,
} from "../utils/monthlyCost"

type MonthlyCostAdviceProps = MonthlyCostEstimateInput & {
  className?: string
}

export function MonthlyCostAdvice({
  className,
  ...monthlyCostInput
}: MonthlyCostAdviceProps) {
  const estimate = calculateEstimatedMonthlyCost(monthlyCostInput)
  if (!estimate) return null

  const costLabel =
    estimate.minCost === estimate.maxCost
      ? formatMoney(estimate.minCost)
      : `${formatMoney(estimate.minCost)}\u2013${formatMoney(estimate.maxCost)}`

  return (
    <p className={cn("text-xs leading-5 text-slate-400", className)}>
      Around {costLabel}/month with electricity and water.
    </p>
  )
}
