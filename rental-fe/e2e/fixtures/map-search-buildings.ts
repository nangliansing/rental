export const smokeAreaBuilding = {
  _id: "building-smoke-area-1",
  name: "Smoke Area Residence",
  buildingType: "Apartment",
  facilities: ["Parking"],
  security: ["CCTV"],
  location: { type: "Point", coordinates: [100.5, 13.5] },
  address: "123 Smoke Street, Bangkok",
  minRent: 8_000,
  maxRent: 12_000,
  listings: [],
  distanceMeters: 500,
}

export const smokeNearbyBuilding = {
  ...smokeAreaBuilding,
  _id: "building-smoke-nearby-1",
  name: "Smoke Nearby Residence",
  address: "456 Pin Lane, Bangkok",
  location: { type: "Point", coordinates: [100.5018, 13.7563] },
  distanceMeters: 120,
}

export const smokePannedAreaBuilding = {
  ...smokeAreaBuilding,
  _id: "building-smoke-panned-1",
  name: "Smoke Panned Area Residence",
  address: "789 Panned View Road, Bangkok",
  location: { type: "Point", coordinates: [100.55, 13.55] },
  distanceMeters: 650,
}

export const smokeLineBuilding = {
  ...smokeAreaBuilding,
  _id: "building-smoke-line-1",
  name: "Smoke Line Corridor Residence",
  address: "101 Line Route, Bangkok",
  location: { type: "Point", coordinates: [100.6421, 13.76531] },
  distanceMeters: 250,
}

export const areaSearchUrl =
  "/?search=area&neLat=14&neLng=101&swLat=13&swLng=100"

export const nearbySearchUrl =
  "/?search=nearby&lat=13.75630&lng=100.50180&radius=1000"
