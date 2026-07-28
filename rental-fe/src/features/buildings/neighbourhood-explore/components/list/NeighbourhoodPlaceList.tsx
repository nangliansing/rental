import {
  forwardRef,
  memo,
  useImperativeHandle,
  useMemo,
  useRef,
  type MutableRefObject,
  type RefObject,
} from "react"

import { cn } from "@/lib/utils"

import type { NeighbourhoodPlace } from "../../../api/getBuildingNeighbourhood"
import {
  NEIGHBOURHOOD_ACTIVE_PLACE_SCROLL_OPTIONS,
  scrollElementIntoViewIfNeeded,
} from "../../utils/scrollElementIntoViewIfNeeded"
import { NeighbourhoodPlaceListItem } from "./NeighbourhoodPlaceListItem"

export type NeighbourhoodPlaceListHandle = {
  scrollToPlace: (placeId: string) => boolean
}

export type NeighbourhoodPlaceListProps = {
  places: NeighbourhoodPlace[]
  activePlaceId: string | null
  onPlaceSelect: (placeId: string) => void
  className?: string
  listClassName?: string
  emptyMessage?: string
  ariaLabel?: string
  scrollRootRef?: RefObject<HTMLElement | null>
}

function createItemRefCallbacks(
  places: NeighbourhoodPlace[],
  itemRefs: MutableRefObject<Map<string, HTMLButtonElement>>,
) {
  const callbacks = new Map<string, (element: HTMLButtonElement | null) => void>()

  for (const place of places) {
    callbacks.set(place.id, (element) => {
      if (element) {
        itemRefs.current.set(place.id, element)
        return
      }

      itemRefs.current.delete(place.id)
    })
  }

  return callbacks
}

export const NeighbourhoodPlaceList = memo(
  forwardRef<NeighbourhoodPlaceListHandle, NeighbourhoodPlaceListProps>(
    function NeighbourhoodPlaceList(
      {
        places,
        activePlaceId,
        onPlaceSelect,
        className,
        listClassName,
        emptyMessage = "No places to show",
        ariaLabel = "Nearby places",
        scrollRootRef,
      },
      ref,
    ) {
      const scrollContainerRef = useRef<HTMLDivElement>(null)
      const itemRefs = useRef(new Map<string, HTMLButtonElement>())
      const usesExternalScrollRoot = Boolean(scrollRootRef)

      const itemRefCallbacks = useMemo(
        () => createItemRefCallbacks(places, itemRefs),
        [places],
      )

      useImperativeHandle(
        ref,
        () => ({
          scrollToPlace(placeId: string) {
            const item = itemRefs.current.get(placeId)
            const container = scrollRootRef?.current ?? scrollContainerRef.current

            if (!item || !container) {
              return false
            }

            return scrollElementIntoViewIfNeeded(
              item,
              container,
              NEIGHBOURHOOD_ACTIVE_PLACE_SCROLL_OPTIONS,
            )
          },
        }),
        [scrollRootRef],
      )

      return (
        <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
          <div
            ref={usesExternalScrollRoot ? undefined : scrollContainerRef}
            role="list"
            aria-label={ariaLabel}
            className={cn(
              usesExternalScrollRoot
                ? "min-h-0"
                : "min-h-0 flex-1 overflow-y-auto",
              listClassName,
            )}
          >
            {places.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                {emptyMessage}
              </p>
            ) : (
              <div className="flex flex-col gap-1 p-2">
                {places.map((place) => (
                  <div key={place.id} role="listitem">
                    <NeighbourhoodPlaceListItem
                      place={place}
                      isActive={place.id === activePlaceId}
                      onSelect={onPlaceSelect}
                      itemRef={itemRefCallbacks.get(place.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    },
  ),
)
