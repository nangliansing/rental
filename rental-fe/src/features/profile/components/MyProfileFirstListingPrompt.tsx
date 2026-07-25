import { Plus } from "lucide-react"
import { Link } from "react-router-dom"

import { MAP_SEARCH_LIST_ROOM_PATH } from "@/features/map-search/constants"

export function MyProfileFirstListingPrompt() {
  return (
    <section className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-left md:px-5 md:py-5">
      <h2 className="text-base font-semibold text-slate-950">
        List your first room
      </h2>
      <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">
        Open the map in list mode to choose an existing building or drop a pin
        for a new one, then submit your room for review.
      </p>

      <Link
        to={MAP_SEARCH_LIST_ROOM_PATH}
        className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Start listing
      </Link>
    </section>
  )
}
