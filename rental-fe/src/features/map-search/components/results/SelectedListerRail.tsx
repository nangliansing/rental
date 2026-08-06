import type { SyntheticEvent } from "react"

import type { SearchAgentProfile } from "@/features/agent"
import { SelectedListersRail } from "@/features/lister-picker"

type SelectedListerRailProps = {
  listers: SearchAgentProfile[]
  onRemove: (listerId: string) => void
}

/** Map-results wrapper around the shared selected-listers rail. */
export function SelectedListerRail({
  listers,
  onRemove,
}: SelectedListerRailProps) {
  const stopPanelDrag = (event: SyntheticEvent) => {
    event.stopPropagation()
  }

  return (
    <SelectedListersRail
      listers={listers}
      onRemove={onRemove}
      className="flex-1 min-w-0 pb-0"
      removeAriaLabel={(displayName) =>
        `Remove ${displayName} from search`
      }
      onInteractionStart={stopPanelDrag}
    />
  )
}
