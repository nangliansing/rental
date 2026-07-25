import type {
  MapSearchSource,
  MapSearchStatus,
} from "../../context/MapSearchSessionContext"
import { getMapSearchAnnouncement } from "../../utils/map-search-announcement"

export function MapSearchResultsAnnouncement({
  status,
  source,
  buildingCount,
}: {
  status: MapSearchStatus
  source: MapSearchSource
  buildingCount: number
}) {
  return (
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {getMapSearchAnnouncement({ status, source, buildingCount })}
    </p>
  )
}
