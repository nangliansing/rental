/**
 * Hides default Google POI icons/labels so only our custom pins show.
 * Note: ignored when the map ID has a linked cloud style — configure POI
 * visibility there for production map IDs.
 */
export const NEIGHBOURHOOD_MAP_STYLES: google.maps.MapTypeStyle[] = [
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.business",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
]
