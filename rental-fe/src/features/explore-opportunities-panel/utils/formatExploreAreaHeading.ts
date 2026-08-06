import type { ExploreOpportunitiesPanelSession } from "../types"

type ExploreAreaSessionSlice = Pick<
  ExploreOpportunitiesPanelSession,
  "areaTitle" | "previewGeo"
>

/**
 * Human heading for the scan area (accordion summary + expanded title).
 * Prefer a place name; otherwise describe the shape in everyday language.
 */
export function formatExploreAreaHeading(
  session: ExploreAreaSessionSlice,
): string {
  const title = session.areaTitle.trim()
  if (title && !isGenericAreaTitle(title)) {
    return title
  }

  switch (session.previewGeo.kind) {
    case "circle":
      return "Around this pin"
    case "line":
      return "Along this line"
    case "area":
      return "This map area"
    case "point":
      return "This spot"
    default: {
      const _exhaustive: never = session.previewGeo
      return _exhaustive
    }
  }
}

function isGenericAreaTitle(title: string): boolean {
  return (
    title === "Visible map area" ||
    title === "Pinned location" ||
    title === "Search line"
  )
}
