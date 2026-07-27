import {
  createContext,
  useContext,
  type ReactNode,
} from "react"
import { APIProvider } from "@vis.gl/react-google-maps"

import { GOOGLE_MAPS_API_PROVIDER_PROPS } from "./googleMapsConfig"

const GoogleMapsApiScopeContext = createContext(false)

export function useGoogleMapsApiScope() {
  return useContext(GoogleMapsApiScopeContext)
}

type GoogleMapsApiProviderProps = {
  children: ReactNode
  onLoad?: () => void
  onError?: (error: unknown) => void
}

export function GoogleMapsApiProvider({
  children,
  onLoad,
  onError,
}: GoogleMapsApiProviderProps) {
  const hasParentScope = useContext(GoogleMapsApiScopeContext)

  if (hasParentScope) {
    return children
  }

  return (
    <GoogleMapsApiScopeContext.Provider value={true}>
      <APIProvider
        {...GOOGLE_MAPS_API_PROVIDER_PROPS}
        onLoad={onLoad}
        onError={onError}
      >
        {children}
      </APIProvider>
    </GoogleMapsApiScopeContext.Provider>
  )
}
