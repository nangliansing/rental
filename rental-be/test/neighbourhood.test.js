import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "../shared/errors/app-error.js";
import {
  haversineDistanceMeters,
  roundCoordinate,
} from "../shared/geo/index.js";
import { buildNeighbourhoodCacheKey } from "../modules/neighbourhood/cache/build-neighbourhood-cache-key.js";
import {
  MAX_BUS_STOPS_RETURNED,
  MAX_RETURNED_PLACES,
  MIN_RADIUS_METERS,
  DENSE_POI_CATEGORY_CAPS,
  NEIGHBOURHOOD_CATEGORIES,
  OSM_NEIGHBOURHOOD_CATEGORIES,
  OSM_WAY_QUERY_CATEGORY_KEYS,
} from "../modules/neighbourhood/neighbourhood.constants.js";
import { buildGetBuildingNeighbourhoodParams } from "../modules/neighbourhood/params/build-get-building-neighbourhood-params.js";
import { buildNeighbourhoodSummary } from "../modules/neighbourhood/services/build-neighbourhood-summary.service.js";
import { buildOverpassQuery } from "../modules/neighbourhood/services/build-overpass-query.service.js";
import {
  classifyOsmPlace,
  isPublicTransportStation,
} from "../modules/neighbourhood/services/classify-osm-place.service.js";
import { dedupeNearbyOsmPlaces } from "../modules/neighbourhood/services/dedupe-nearby-osm-places.service.js";
import { dedupeTransitPlaces } from "../modules/neighbourhood/services/dedupe-transit-places.service.js";
import {
  enrichTransitPlace,
  resolveTransitLine,
  resolveTransitMode,
} from "../modules/neighbourhood/services/enrich-transit-place.service.js";
import { filterPlacesByRadius } from "../modules/neighbourhood/services/filter-places-by-radius.service.js";
import { loadStaticTransitPlaces } from "../modules/neighbourhood/services/load-static-transit-places.service.js";
import { normalizeOverpassResponse } from "../modules/neighbourhood/services/normalize-overpass-response.service.js";
import { dedupeNearbyBusStops } from "../modules/neighbourhood/services/partition-transit-places.service.js";
import {
  isValidNeighbourhoodPlace,
  sanitizeNeighbourhoodPlaces,
} from "../modules/neighbourhood/services/neighbourhood-place.utils.js";

const validBuildingId = "6790f1f2f1d2c3b4a5e6d7c8";

test("haversineDistanceMeters returns straight-line distance in meters", () => {
  const origin = { lat: 13.75, lng: 100.5 };
  const destination = { lat: 13.751, lng: 100.501 };
  const distanceMeters = haversineDistanceMeters(origin, destination);

  assert.ok(distanceMeters > 100);
  assert.ok(distanceMeters < 200);
});

test("buildNeighbourhoodCacheKey rounds coordinates for shared cache entries", () => {
  assert.equal(
    buildNeighbourhoodCacheKey({
      origin: { lat: 13.75678, lng: 100.64231 },
      fetchRadiusMeters: 2000,
    }),
    "13.757:100.642:2000:v5",
  );

  assert.equal(
    buildNeighbourhoodCacheKey({
      origin: { lat: 13.75678, lng: 100.64231 },
      fetchRadiusMeters: 2000,
    }),
    buildNeighbourhoodCacheKey({
      origin: { lat: 13.75672, lng: 100.64228 },
      fetchRadiusMeters: 2000,
    }),
  );
});

test("buildNeighbourhoodCacheKey changes when cache version changes", () => {
  assert.notEqual(
    buildNeighbourhoodCacheKey({
      origin: { lat: 13.765, lng: 100.641 },
      fetchRadiusMeters: 2000,
      cacheVersion: 1,
    }),
    buildNeighbourhoodCacheKey({
      origin: { lat: 13.765, lng: 100.641 },
      fetchRadiusMeters: 2000,
      cacheVersion: 2,
    }),
  );
});

test("classifyOsmPlace maps every configured OSM category", () => {
  for (const category of OSM_NEIGHBOURHOOD_CATEGORIES) {
    for (const rule of category.osmTagRules) {
      const tags = { [rule.key]: rule.value };

      assert.equal(classifyOsmPlace(tags), category.key);
    }
  }
});

test("classifyOsmPlace maps department stores and wholesalers as supermarkets", () => {
  assert.equal(classifyOsmPlace({ shop: "department_store" }), "supermarket");
  assert.equal(classifyOsmPlace({ shop: "wholesale" }), "supermarket");
});

test("classifyOsmPlace recognizes bus stops and bus stations", () => {
  assert.equal(
    classifyOsmPlace({ highway: "bus_stop", name: "Route 36" }),
    "public_transport",
  );
  assert.equal(
    classifyOsmPlace({
      public_transport: "platform",
      bus: "yes",
      name: "BMTA Platform",
    }),
    "public_transport",
  );
  assert.equal(
    classifyOsmPlace({ amenity: "bus_station", name: "Bangkok Bus Terminal" }),
    "public_transport",
  );
});

test("classifyOsmPlace uses category priority when multiple tags match", () => {
  assert.equal(
    classifyOsmPlace({ shop: "convenience", amenity: "restaurant" }),
    "convenience",
  );
  assert.equal(classifyOsmPlace({ amenity: "cafe" }), "cafe");
  assert.equal(classifyOsmPlace({ amenity: "bank" }), null);
});

test("classifyOsmPlace recognizes Bangkok transit stations from OSM tags", () => {
  assert.equal(
    classifyOsmPlace({
      station: "subway",
      name: "MRT Sukhumvit",
      network: "MRT",
    }),
    "public_transport",
  );
  assert.equal(
    classifyOsmPlace({
      station: "light_rail",
      name: "BTS Asok",
      network: "BTS",
    }),
    "public_transport",
  );
  assert.equal(
    classifyOsmPlace({
      public_transport: "station",
      railway: "station",
      network: "BTS",
      name: "Asok",
    }),
    "public_transport",
  );
  assert.equal(
    isPublicTransportStation({
      public_transport: "station",
      railway: "station",
      name: "State Railway Station",
    }),
    false,
  );
});

test("classifyOsmPlace recognizes MRT monorail stations such as Yaek Lam Sali", () => {
  const yaekLamSaliTags = {
    public_transport: "station",
    railway: "station",
    station: "monorail",
    monorail: "yes",
    name: "แยกลำสาลี",
    "name:en": "Yaek Lam Sali",
    operator: "Eastern Bangkok Monorail",
    ref: "YL09",
  };

  assert.equal(classifyOsmPlace(yaekLamSaliTags), "public_transport");

  const places = normalizeOverpassResponse({
    elements: [
      {
        type: "node",
        id: 10867419326,
        lat: 13.7617,
        lon: 100.6455,
        tags: yaekLamSaliTags,
      },
    ],
  });

  assert.deepEqual(places, [
    {
      id: "osm-node-10867419326",
      name: "แยกลำสาลี",
      lat: 13.7617,
      lng: 100.6455,
      category: "public_transport",
      mode: "mrt",
      line: "Yellow Line",
    },
  ]);
});

test("resolveTransitMode and resolveTransitLine infer Bangkok transit metadata", () => {
  assert.equal(
    resolveTransitMode({ station: "light_rail", network: "BTS" }, "BTS Asok"),
    "bts",
  );
  assert.equal(
    resolveTransitMode({ station: "subway", network: "MRT" }, "MRT Silom"),
    "mrt",
  );
  assert.equal(
    resolveTransitLine({ line: "Blue Line" }, "MRT Silom"),
    "Blue Line",
  );
  assert.equal(
    resolveTransitLine({ network: "BTS", station: "light_rail" }, "BTS Thong Lo"),
    null,
  );
});

test("normalizeOverpassResponse enriches public transport places", () => {
  const places = normalizeOverpassResponse({
    elements: [
      {
        type: "node",
        id: 42,
        lat: 13.737,
        lon: 100.5603,
        tags: {
          name: "BTS Asok",
          station: "light_rail",
          network: "BTS",
          line: "Sukhumvit Line",
        },
      },
    ],
  });

  assert.deepEqual(places, [
    {
      id: "osm-node-42",
      name: "BTS Asok",
      lat: 13.737,
      lng: 100.5603,
      category: "public_transport",
      mode: "bts",
      line: "Sukhumvit Line",
    },
  ]);
});

test("dedupeTransitPlaces prefers static stations over nearby OSM duplicates", () => {
  const places = dedupeTransitPlaces([
    {
      id: "osm-node-99",
      name: "BTS Bang Chak",
      lat: 13.6963,
      lng: 100.6051,
      category: "public_transport",
      mode: "bts",
    },
    {
      id: "bts-bang-chak",
      name: "BTS Bang Chak",
      lat: 13.6963,
      lng: 100.6051,
      category: "public_transport",
      mode: "bts",
      line: "Sukhumvit Line",
    },
    {
      id: "osm-node-100",
      name: "Remote BTS",
      lat: 13.8,
      lng: 100.6,
      category: "public_transport",
      mode: "bts",
    },
    {
      id: "place-1",
      name: "Cafe",
      lat: 13.75,
      lng: 100.5,
      category: "cafe",
    },
  ]);

  assert.deepEqual(
    places.map((place) => place.id).sort(),
    ["bts-bang-chak", "osm-node-100", "place-1"],
  );
});

test("enrichTransitPlace uses nearby static station metadata for sparse OSM tags", () => {
  const enriched = enrichTransitPlace(
    {
      id: "osm-node-55",
      name: "Unnamed place",
      lat: 13.6963,
      lng: 100.6051,
      category: "public_transport",
    },
    { station: "light_rail" },
  );

  assert.equal(enriched.name, "BTS Bang Chak");
  assert.equal(enriched.mode, "bts");
  assert.equal(enriched.line, "Sukhumvit Line");
});

test("normalizeOverpassResponse supports nodes, centered ways, and name fallbacks", () => {
  const places = normalizeOverpassResponse({
    elements: [
      {
        type: "node",
        id: 1,
        lat: 13.75,
        lon: 100.5,
        tags: { name: "7-Eleven", shop: "convenience" },
      },
      {
        type: "way",
        id: 2,
        center: { lat: 13.751, lon: 100.501 },
        tags: { "name:en": "Local Market", amenity: "marketplace" },
      },
      {
        type: "node",
        id: 3,
        lat: 13.752,
        lon: 100.502,
        tags: { brand: "Big C", shop: "supermarket" },
      },
      {
        type: "node",
        id: 4,
        lat: 13.753,
        lon: 100.503,
        tags: { amenity: "cafe" },
      },
      {
        type: "node",
        id: 5,
        lat: 13.754,
        lon: 100.504,
        tags: { amenity: "bank" },
      },
      {
        type: "way",
        id: 6,
        tags: { amenity: "restaurant", name: "Missing Center" },
      },
    ],
  });

  assert.deepEqual(
    places.map((place) => ({
      id: place.id,
      name: place.name,
      category: place.category,
    })),
    [
      { id: "osm-node-1", name: "7-Eleven", category: "convenience" },
      { id: "osm-way-2", name: "Local Market", category: "market" },
      { id: "osm-node-3", name: "Big C", category: "supermarket" },
      { id: "osm-node-4", name: "Unnamed place", category: "cafe" },
    ],
  );
});

test("normalizeOverpassResponse dedupes nearby node and way POIs for the same place", () => {
  const places = normalizeOverpassResponse({
    elements: [
      {
        type: "node",
        id: 100,
        lat: 13.76461,
        lon: 100.64168,
        tags: {
          amenity: "marketplace",
          name: "Tawanna shopping park",
        },
      },
      {
        type: "way",
        id: 316166705,
        center: { lat: 13.76463, lon: 100.6417 },
        tags: {
          amenity: "marketplace",
          "name:en": "Tawanna shopping park",
        },
      },
    ],
  });

  assert.equal(places.length, 1);
  assert.equal(places[0].id, "osm-way-316166705");
  assert.equal(places[0].category, "market");
});

test("dedupeNearbyOsmPlaces keeps distinct same-category places when names differ", () => {
  const places = dedupeNearbyOsmPlaces([
    {
      id: "osm-node-1",
      name: "7-Eleven",
      category: "convenience",
      lat: 13.75,
      lng: 100.5,
    },
    {
      id: "osm-node-2",
      name: "FamilyMart",
      category: "convenience",
      lat: 13.75001,
      lng: 100.50001,
    },
  ]);

  assert.equal(places.length, 2);
});

test("buildOverpassQuery includes all configured OSM categories", () => {
  const query = buildOverpassQuery({
    origin: { lat: 13.75, lng: 100.5 },
    fetchRadiusMeters: 2000,
  });

  for (const category of OSM_NEIGHBOURHOOD_CATEGORIES) {
    for (const rule of category.osmTagRules) {
      assert.match(query, new RegExp(`${rule.key}"="${rule.value}"`));
    }
  }

  assert.match(query, /network"~"\^\(BTS\|MRT\|SRT\|Airport Rail Link\)"/);
  assert.match(query, /way\["station"="monorail"\]/);
  assert.match(
    query,
    /node\["public_transport"="station"\]\["station"="monorail"\]/,
  );
  assert.match(query, /around:2000,13\.75,100\.5/);
});

test("buildOverpassQuery requests area ways for large retail and healthcare POIs", () => {
  const query = buildOverpassQuery({
    origin: { lat: 13.7646, lng: 100.6417 },
    fetchRadiusMeters: 2000,
  });

  for (const categoryKey of OSM_WAY_QUERY_CATEGORY_KEYS) {
    const category = OSM_NEIGHBOURHOOD_CATEGORIES.find(
      (entry) => entry.key === categoryKey,
    );

    assert.ok(category);

    for (const rule of category.osmTagRules) {
      assert.match(
        query,
        new RegExp(`way\\["${rule.key}"="${rule.value}"\\]`),
      );
    }
  }

  assert.doesNotMatch(query, /way\["shop"="convenience"\]/);
  assert.match(query, /node\["highway"="bus_stop"\]/);
  assert.match(query, /node\["amenity"="bus_station"\]/);
});

test("buildNeighbourhoodSummary excludes zero-count categories from tabs", () => {
  const { summary, categories } = buildNeighbourhoodSummary([
    {
      id: "place-1",
      name: "Restaurant",
      category: "restaurant",
      lat: 13.75,
      lng: 100.5,
      distanceMeters: 100,
    },
    {
      id: "place-2",
      name: "7-Eleven",
      category: "convenience",
      lat: 13.751,
      lng: 100.501,
      distanceMeters: 150,
    },
  ]);

  assert.equal(summary.all, 2);
  assert.equal(summary.restaurant, 1);
  assert.equal(summary.gym, 0);
  assert.deepEqual(
    categories.map((category) => category.key),
    ["convenience", "restaurant"],
  );
});

test("buildNeighbourhoodSummary returns empty tabs when no places match", () => {
  const { summary, categories } = buildNeighbourhoodSummary([]);

  assert.equal(summary.all, 0);
  assert.deepEqual(categories, []);
  assert.equal(
    NEIGHBOURHOOD_CATEGORIES.every(
      (category) => summary[category.key] === 0,
    ),
    true,
  );
});

test("buildNeighbourhoodSummary keeps configured importance order", () => {
  const { categories } = buildNeighbourhoodSummary([
    {
      id: "gym-1",
      name: "Gym",
      category: "gym",
      lat: 13.75,
      lng: 100.5,
      distanceMeters: 100,
    },
    {
      id: "bts-1",
      name: "BTS",
      category: "public_transport",
      lat: 13.751,
      lng: 100.501,
      distanceMeters: 120,
    },
    {
      id: "cafe-1",
      name: "Cafe",
      category: "cafe",
      lat: 13.752,
      lng: 100.502,
      distanceMeters: 140,
    },
  ]);

  assert.deepEqual(
    categories.map((category) => category.key),
    ["public_transport", "cafe", "gym"],
  );
});

test("filterPlacesByRadius sorts by straight-line distance and applies radius", () => {
  const origin = { lat: 13.75, lng: 100.5 };
  const { places } = filterPlacesByRadius({
    origin,
    radiusMeters: 250,
    places: [
      {
        id: "far",
        name: "Far Place",
        category: "restaurant",
        lat: 13.76,
        lng: 100.51,
      },
      {
        id: "near",
        name: "Near Place",
        category: "convenience",
        lat: 13.751,
        lng: 100.501,
      },
    ],
  });

  assert.equal(places.length, 1);
  assert.equal(places[0].id, "near");
  assert.ok(places[0].distanceMeters > 0);
});

test("filterPlacesByRadius caps dense convenience POIs per category", () => {
  const origin = { lat: 13.75, lng: 100.5 };
  const conveniencePlaces = Array.from({ length: 30 }, (_, index) => ({
    id: `place-${index}`,
    name: `Place ${index}`,
    category: "convenience",
    lat: 13.75 + index * 0.0006,
    lng: 100.5,
  }));

  const { places, truncation } = filterPlacesByRadius({
    origin,
    radiusMeters: 2000,
    places: conveniencePlaces,
  });

  assert.equal(places.length, DENSE_POI_CATEGORY_CAPS.convenience);
  assert.equal(truncation.truncated, true);
  assert.equal(truncation.categories.convenience, true);
});

test("filterPlacesByRadius applies a global non-transit backstop after category caps", () => {
  const origin = { lat: 13.75, lng: 100.5 };
  const supermarketPlaces = Array.from(
    { length: MAX_RETURNED_PLACES + 25 },
    (_, index) => ({
      id: `supermarket-${index}`,
      name: `Supermarket ${index}`,
      category: "supermarket",
      lat: 13.75 + index * 0.00001,
      lng: 100.5,
    }),
  );

  const { places, truncation } = filterPlacesByRadius({
    origin,
    radiusMeters: 2000,
    places: supermarketPlaces,
  });

  assert.equal(places.length, MAX_RETURNED_PLACES);
  assert.equal(truncation.truncated, true);
  assert.equal(truncation.globalBackstopApplied, true);
  assert.ok(places[0].distanceMeters <= places.at(-1).distanceMeters);
});

test("filterPlacesByRadius always keeps public transport even when POI cap is reached", () => {
  const origin = { lat: 13.7692, lng: 100.6396 };
  const conveniencePlaces = Array.from(
    { length: MAX_RETURNED_PLACES + 10 },
    (_, index) => ({
      id: `place-${index}`,
      name: `Place ${index}`,
      category: "convenience",
      lat: 13.7692 + index * 0.00001,
      lng: 100.6396,
    }),
  );

  const { places } = filterPlacesByRadius({
    origin,
    radiusMeters: 2000,
    places: [
      ...conveniencePlaces,
      {
        id: "mrt-bang-kapi",
        name: "MRT Bang Kapi",
        category: "public_transport",
        lat: 13.7692,
        lng: 100.6396,
      },
    ],
  });

  assert.equal(
    places.filter((place) => place.category !== "public_transport").length,
    DENSE_POI_CATEGORY_CAPS.convenience,
  );
  assert.ok(
    places.some(
      (place) =>
        place.id === "mrt-bang-kapi" && place.category === "public_transport",
    ),
  );
});

test("normalizeOverpassResponse enriches bus stops with mode and fallback labels", () => {
  const [busStop, busStation] = normalizeOverpassResponse({
    elements: [
      {
        type: "node",
        id: 501,
        lat: 13.75,
        lon: 100.5,
        tags: { highway: "bus_stop", ref: "142" },
      },
      {
        type: "node",
        id: 502,
        lat: 13.751,
        lon: 100.501,
        tags: { amenity: "bus_station", name: "Bangkok Bus Terminal" },
      },
    ],
  });

  assert.equal(busStop.name, "Bus stop 142");
  assert.equal(busStop.mode, "bus");
  assert.equal(busStop.transitRole, "bus_stop");
  assert.equal(busStation.name, "Bangkok Bus Terminal");
  assert.equal(busStation.mode, "bus");
  assert.equal(busStation.transitRole, "bus_station");
});

test("dedupeNearbyBusStops keeps the nearest stop when duplicates are close together", () => {
  const deduped = dedupeNearbyBusStops([
    {
      id: "bus-1",
      name: "Bus stop 1",
      category: "public_transport",
      mode: "bus",
      transitRole: "bus_stop",
      lat: 13.75,
      lng: 100.5,
      distanceMeters: 80,
    },
    {
      id: "bus-2",
      name: "Bus stop 2",
      category: "public_transport",
      mode: "bus",
      transitRole: "bus_stop",
      lat: 13.75001,
      lng: 100.50001,
      distanceMeters: 120,
    },
  ]);

  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].id, "bus-1");
});

test("filterPlacesByRadius marks public transport truncated when bus stops are capped", () => {
  const origin = { lat: 13.75, lng: 100.5 };
  const busStops = Array.from({ length: MAX_BUS_STOPS_RETURNED + 5 }, (_, index) => ({
    id: `bus-${index}`,
    name: `Bus stop ${index}`,
    category: "public_transport",
    mode: "bus",
    transitRole: "bus_stop",
    lat: 13.75 + index * 0.0006,
    lng: 100.5,
  }));

  const { truncation } = filterPlacesByRadius({
    origin,
    radiusMeters: 2000,
    places: busStops,
  });

  assert.equal(truncation.truncated, true);
  assert.equal(truncation.categories.public_transport, true);
});

test("filterPlacesByRadius ignores invalid cached places safely", () => {
  const origin = { lat: 13.75, lng: 100.5 };
  const { places } = filterPlacesByRadius({
    origin,
    radiusMeters: 2000,
    places: [
      {
        id: "valid",
        name: "Valid Store",
        category: "convenience",
        lat: 13.751,
        lng: 100.501,
      },
      {
        id: "",
        name: "Missing id",
        category: "convenience",
        lat: 13.751,
        lng: 100.501,
      },
      {
        id: "bad-coords",
        name: "Bad Coords",
        category: "convenience",
        lat: Number.NaN,
        lng: 100.501,
      },
      {
        id: "unknown-category",
        name: "Unknown",
        category: "bank",
        lat: 13.751,
        lng: 100.501,
      },
    ],
  });

  assert.equal(places.length, 1);
  assert.equal(places[0].id, "valid");
});

test("sanitizeNeighbourhoodPlaces keeps valid transit metadata", () => {
  const [place] = sanitizeNeighbourhoodPlaces([
    {
      id: "bts-asok",
      name: "BTS Asok",
      category: "public_transport",
      lat: 13.737,
      lng: 100.5603,
      mode: "bts",
      line: "Sukhumvit Line",
      transitRole: "rail",
    },
  ]);

  assert.equal(isValidNeighbourhoodPlace(place), true);
  assert.equal(place.line, "Sukhumvit Line");
});

test("filterPlacesByRadius caps bus stops but keeps rail and bus stations", () => {
  const origin = { lat: 13.75, lng: 100.5 };
  const busStops = Array.from({ length: MAX_BUS_STOPS_RETURNED + 5 }, (_, index) => ({
    id: `bus-${index}`,
    name: `Bus stop ${index}`,
    category: "public_transport",
    mode: "bus",
    transitRole: "bus_stop",
    lat: 13.75 + index * 0.0006,
    lng: 100.5,
  }));

  const { places } = filterPlacesByRadius({
    origin,
    radiusMeters: 2000,
    places: [
      ...busStops,
      {
        id: "bts-asok",
        name: "BTS Asok",
        category: "public_transport",
        mode: "bts",
        lat: 13.75,
        lng: 100.5,
      },
      {
        id: "bus-terminal",
        name: "Main Bus Terminal",
        category: "public_transport",
        mode: "bus",
        transitRole: "bus_station",
        lat: 13.751,
        lng: 100.501,
      },
    ],
  });

  assert.equal(
    places.filter((place) => place.transitRole === "bus_stop").length,
    MAX_BUS_STOPS_RETURNED,
  );
  assert.ok(places.some((place) => place.id === "bts-asok"));
  assert.ok(places.some((place) => place.id === "bus-terminal"));
});

test("classifyOsmPlace recognizes ferry terminals", () => {
  assert.equal(
    classifyOsmPlace({
      amenity: "ferry_terminal",
      name: "The Mall Bangkapi Pier",
      operator: "Khlong Saen Saep Express Boat",
    }),
    "public_transport",
  );
});

test("loadStaticTransitPlaces returns BTS/MRT stations within fetch radius", () => {
  const places = loadStaticTransitPlaces({
    origin: { lat: 13.6963, lng: 100.6051 },
    fetchRadiusMeters: 1500,
  });

  assert.ok(places.some((place) => place.id === "bts-bang-chak"));
  assert.ok(places.every((place) => place.category === "public_transport"));
  assert.ok(
    places.every(
      (place) =>
        typeof place.mode === "string" && typeof place.line === "string",
    ),
  );
});

test("loadStaticTransitPlaces returns no results when fetch radius excludes all stations", () => {
  const places = loadStaticTransitPlaces({
    origin: { lat: 0, lng: 0 },
    fetchRadiusMeters: 500,
  });

  assert.deepEqual(places, []);
});

test("buildGetBuildingNeighbourhoodParams validates radius bounds", () => {
  assert.throws(
    () =>
      buildGetBuildingNeighbourhoodParams({
        buildingIdInput: "invalid-id",
        queryInput: {},
      }),
    (error) => error.code === "VALIDATION_ERROR",
  );

  assert.throws(
    () =>
      buildGetBuildingNeighbourhoodParams({
        buildingIdInput: validBuildingId,
        queryInput: { radiusM: 1500, fetchRadiusM: 1000 },
      }),
    (error) =>
      error.statusCode === 422 &&
      error.message.includes("radiusM must be less than or equal to fetchRadiusM"),
  );

  assert.throws(
    () =>
      buildGetBuildingNeighbourhoodParams({
        buildingIdInput: validBuildingId,
        queryInput: { radiusM: MIN_RADIUS_METERS - 1 },
      }),
    (error) =>
      error.statusCode === 422 &&
      error.message.includes(`radiusM must be at least ${MIN_RADIUS_METERS}`),
  );

  assert.throws(
    () =>
      buildGetBuildingNeighbourhoodParams({
        buildingIdInput: validBuildingId,
        queryInput: { radiusM: "not-a-number" },
      }),
    (error) => error.code === "VALIDATION_ERROR",
  );

  const defaults = buildGetBuildingNeighbourhoodParams({
    buildingIdInput: validBuildingId,
    queryInput: {},
  });
  const fromQueryStrings = buildGetBuildingNeighbourhoodParams({
    buildingIdInput: validBuildingId,
    queryInput: { radiusM: "1000", fetchRadiusM: "2000" },
  });

  assert.equal(defaults.radiusMeters, 1000);
  assert.equal(defaults.fetchRadiusMeters, 2000);
  assert.equal(fromQueryStrings.radiusMeters, 1000);
  assert.equal(fromQueryStrings.fetchRadiusMeters, 2000);
});

test("roundCoordinate supports configurable precision", () => {
  assert.equal(roundCoordinate(13.75678, 2), 13.76);
});

test("normalizeOverpassResponse returns an empty list for invalid payloads", () => {
  assert.deepEqual(normalizeOverpassResponse(null), []);
  assert.deepEqual(normalizeOverpassResponse({ elements: null }), []);
});

test("buildNeighbourhoodSummary exposes labels for visible categories", () => {
  const { categories } = buildNeighbourhoodSummary([
    {
      id: "pharmacy-1",
      name: "Pharmacy",
      category: "pharmacy",
      lat: 13.75,
      lng: 100.5,
      distanceMeters: 100,
    },
  ]);

  assert.deepEqual(categories, [
    {
      key: "pharmacy",
      label: "Pharmacies",
      priority: 6,
      count: 1,
    },
  ]);
});

test("filterPlacesByRadius breaks ties by place name", () => {
  const origin = { lat: 13.75, lng: 100.5 };
  const { places } = filterPlacesByRadius({
    origin,
    radiusMeters: 500,
    places: [
      {
        id: "b",
        name: "Beta Shop",
        category: "convenience",
        lat: 13.751,
        lng: 100.501,
      },
      {
        id: "a",
        name: "Alpha Shop",
        category: "convenience",
        lat: 13.751,
        lng: 100.501,
      },
    ],
  });

  assert.deepEqual(
    places.map((place) => place.name),
    ["Alpha Shop", "Beta Shop"],
  );
});

test("classifyOsmPlace distinguishes fast food from cafes", () => {
  assert.equal(classifyOsmPlace({ amenity: "fast_food" }), "restaurant");
  assert.equal(classifyOsmPlace({ amenity: "cafe" }), "cafe");
});

test("buildGetBuildingNeighbourhoodParams rejects out-of-range radii", () => {
  assert.throws(
    () =>
      buildGetBuildingNeighbourhoodParams({
        buildingIdInput: validBuildingId,
        queryInput: { radiusM: 2001 },
      }),
    (error) => error.code === "VALIDATION_ERROR",
  );

  assert.throws(
    () =>
      buildGetBuildingNeighbourhoodParams({
        buildingIdInput: validBuildingId,
        queryInput: { fetchRadiusM: 0 },
      }),
    (error) => error.code === "VALIDATION_ERROR",
  );
});

test("normalizeOverpassResponse ignores duplicate unsupported elements safely", () => {
  const places = normalizeOverpassResponse({
    elements: [{ type: "relation", id: 99, tags: { amenity: "school" } }],
  });

  assert.deepEqual(places, []);
});

test("buildOverpassQuery always requests centered tags output", () => {
  const query = buildOverpassQuery({
    origin: { lat: 13.6963, lng: 100.6051 },
    fetchRadiusMeters: 1500,
  });

  assert.match(query, /out center tags;/);
});

test("loadStaticTransitPlaces never returns duplicate station ids", () => {
  const places = loadStaticTransitPlaces({
    origin: { lat: 13.6963, lng: 100.6051 },
    fetchRadiusMeters: 5000,
  });
  const ids = places.map((place) => place.id);

  assert.equal(ids.length, new Set(ids).size);
});

test("buildNeighbourhoodSummary count matches number of places provided", () => {
  const places = [
    "convenience",
    "convenience",
    "restaurant",
    "public_transport",
  ].map((category, index) => ({
    id: `place-${index}`,
    name: `Place ${index}`,
    category,
    lat: 13.75,
    lng: 100.5,
    distanceMeters: index * 10,
  }));

  const { summary } = buildNeighbourhoodSummary(places);

  assert.equal(summary.all, places.length);
  assert.equal(summary.convenience, 2);
  assert.equal(summary.restaurant, 1);
  assert.equal(summary.public_transport, 1);
});

test("filterPlacesByRadius returns an empty list when nothing is inside radius", () => {
  const { places } = filterPlacesByRadius({
    origin: { lat: 13.75, lng: 100.5 },
    radiusMeters: 10,
    places: [
      {
        id: "far",
        name: "Far Place",
        category: "restaurant",
        lat: 13.8,
        lng: 100.6,
      },
    ],
  });

  assert.deepEqual(places, []);
});

test("buildGetBuildingNeighbourhoodParams accepts minimum supported radius", () => {
  const params = buildGetBuildingNeighbourhoodParams({
    buildingIdInput: validBuildingId,
    queryInput: { radiusM: MIN_RADIUS_METERS, fetchRadiusM: 2000 },
  });

  assert.equal(params.radiusMeters, MIN_RADIUS_METERS);
});

test("normalizeOverpassResponse classifies clinics as hospitals tab", () => {
  const [place] = normalizeOverpassResponse({
    elements: [
      {
        type: "node",
        id: 10,
        lat: 13.75,
        lon: 100.5,
        tags: { amenity: "clinic", name: "Local Clinic" },
      },
    ],
  });

  assert.equal(place.category, "hospital");
});

test("classifyOsmPlace returns null for empty tags", () => {
  assert.equal(classifyOsmPlace({}), null);
  assert.equal(classifyOsmPlace(null), null);
});

test("buildNeighbourhoodCacheKey includes fetch radius in the cache key", () => {
  const origin = { lat: 13.696, lng: 100.605 };

  assert.notEqual(
    buildNeighbourhoodCacheKey({ origin, fetchRadiusMeters: 1000 }),
    buildNeighbourhoodCacheKey({ origin, fetchRadiusMeters: 2000 }),
  );
});

test("filterPlacesByRadius rounds distanceMeters to whole meters", () => {
  const { places } = filterPlacesByRadius({
    origin: { lat: 13.75, lng: 100.5 },
    radiusMeters: 1000,
    places: [
      {
        id: "near",
        name: "Near Place",
        category: "convenience",
        lat: 13.75001,
        lng: 100.50001,
      },
    ],
  });

  const [place] = places;

  assert.equal(place.distanceMeters, Math.round(place.distanceMeters));
});

test("buildNeighbourhoodSummary marks truncated dense categories", () => {
  const { summary, categories } = buildNeighbourhoodSummary(
    Array.from({ length: DENSE_POI_CATEGORY_CAPS.convenience }, (_, index) => ({
      id: `c-${index}`,
      name: `Store ${index}`,
      category: "convenience",
      lat: 13.75,
      lng: 100.5,
      distanceMeters: index * 10,
    })),
    {
      truncated: true,
      totalWithinRadius: 30,
      truncatedCategories: { convenience: true },
    },
  );

  assert.equal(summary.all, DENSE_POI_CATEGORY_CAPS.convenience);
  assert.equal(summary.truncated, true);
  assert.equal(summary.totalWithinRadius, 30);
  assert.equal(categories[0]?.truncated, true);
});

test("buildGetBuildingNeighbourhoodParams throws AppError instances", () => {
  assert.throws(
    () =>
      buildGetBuildingNeighbourhoodParams({
        buildingIdInput: validBuildingId,
        queryInput: { radiusM: 499 },
      }),
    (error) => error instanceof AppError,
  );
});
