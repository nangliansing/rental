import { useCallback, useRef, useState } from "react"
import { useMapSearchMap } from "../hooks/useMapSearchMap"

import { useMapProgrammaticMove } from "../context/MapProgrammaticMoveContext"
import { focusMapOnPlace } from "../utils/map-camera"
import type { SearchedPlace } from "../types"

export type PlacePrediction = {
  id: string
  text: string
  prediction: google.maps.places.PlacePrediction
}

type SearchPlaceInput = {
  query: string
  onPlaceFound: (place: SearchedPlace) => void
}

function toSearchedPlace(
  place: google.maps.places.Place,
  fallbackName: string,
): SearchedPlace | null {
  if (!place.location) return null

  return {
    name: place.displayName ?? fallbackName,
    position: {
      lat: place.location.lat(),
      lng: place.location.lng(),
    },
  }
}

export function usePlaceSearch() {
  const map = useMapSearchMap()
  const { beginProgrammaticMove } = useMapProgrammaticMove()
  const [predictions, setPredictions] = useState<PlacePrediction[]>([])
  const [predictionError, setPredictionError] = useState<string | null>(null)
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const predictionRequestRef = useRef(0)

  const focusPlaceOnMap = useCallback(
    (
      position: SearchedPlace["position"],
      viewport?: google.maps.LatLngBounds | null,
    ) => {
      if (!map) return

      beginProgrammaticMove()
      focusMapOnPlace(map, position, viewport)
    },
    [beginProgrammaticMove, map],
  )

  const getSessionToken = useCallback(async () => {
    if (sessionTokenRef.current) {
      return sessionTokenRef.current
    }

    const { AutocompleteSessionToken } =
      await google.maps.importLibrary("places")

    sessionTokenRef.current = new AutocompleteSessionToken()

    return sessionTokenRef.current
  }, [])

  const resetSessionToken = useCallback(() => {
    sessionTokenRef.current = null
  }, [])

  const cancelPredictionRequest = useCallback(() => {
    predictionRequestRef.current += 1
  }, [])

  const clearPredictionError = useCallback(() => {
    setPredictionError(null)
  }, [])

  const clearPredictions = useCallback(() => {
    setPredictions([])
  }, [])

  const getPredictions = useCallback(
    async (query: string) => {
      const input = query.trim()
      predictionRequestRef.current += 1
      const requestId = predictionRequestRef.current

      if (!input) {
        setPredictions([])
        setPredictionError(null)
        resetSessionToken()
        return
      }

      try {
        setPredictionError(null)
        const { AutocompleteSuggestion } =
          await google.maps.importLibrary("places")

        const sessionToken = await getSessionToken()

        const { suggestions } =
          await AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input,
            region: "th",
            language: "en",
            sessionToken,
          })

        if (requestId !== predictionRequestRef.current) return

        setPredictions(
          suggestions
            .filter((suggestion) => suggestion.placePrediction)
            .map((suggestion) => {
              const prediction = suggestion.placePrediction!

              return {
                id: prediction.placeId,
                text: prediction.text.toString(),
                prediction,
              }
            }),
        )
      } catch {
        if (requestId === predictionRequestRef.current) {
          setPredictions([])
          setPredictionError("Place search is unavailable. Try again.")
        }
      }
    },
    [getSessionToken, resetSessionToken],
  )

  const selectPrediction = async (
    prediction: google.maps.places.PlacePrediction,
    onPlaceFound: (place: SearchedPlace) => void,
  ) => {
    if (!map) return false

    try {
      const place = prediction.toPlace()

      await place.fetchFields({
        fields: ["displayName", "formattedAddress", "location", "viewport"],
      })

      const searchedPlace = toSearchedPlace(
        place,
        prediction.text.toString(),
      )
      if (!searchedPlace) return false

      onPlaceFound(searchedPlace)
      focusPlaceOnMap(searchedPlace.position, place.viewport)

      setPredictions([])
      setPredictionError(null)
      resetSessionToken()
      predictionRequestRef.current += 1
      return true
    } catch {
      setPredictionError("This place could not be loaded. Try again.")
      return false
    }
  }

  const searchPlace = async ({ query, onPlaceFound }: SearchPlaceInput) => {
    const textQuery = query.trim()

    if (!map || !textQuery) return false

    try {
      const { Place } = await google.maps.importLibrary("places")

      const { places } = await Place.searchByText({
        textQuery,
        fields: ["displayName", "formattedAddress", "location", "viewport"],
        region: "th",
        language: "en",
      })

      const place = places[0]
      const searchedPlace = toSearchedPlace(place, textQuery)
      if (!searchedPlace) return false

      onPlaceFound(searchedPlace)
      focusPlaceOnMap(searchedPlace.position, place.viewport)

      setPredictions([])
      setPredictionError(null)
      resetSessionToken()
      predictionRequestRef.current += 1
      return true
    } catch {
      setPredictionError("This place could not be loaded. Try again.")
      return false
    }
  }

  return {
    predictions,
    predictionError,
    cancelPredictionRequest,
    clearPredictionError,
    clearPredictions,
    getPredictions,
    selectPrediction,
    searchPlace,
  }
}
