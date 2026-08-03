import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";

import { AppError } from "../shared/errors/app-error.js";
import {
  CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH,
  CLIENT_REQUEST_NAME_MAX_LENGTH,
  CLIENT_REQUEST_PLACE_NAME_MAX_LENGTH,
  GEO_SEARCH_MAX_DISTANCE_METERS,
  GEO_SEARCH_MAX_RADIUS_METERS,
  GEO_SEARCH_MIN_DISTANCE_METERS,
  GEO_SEARCH_MIN_RADIUS_METERS,
  GEO_SEARCH_MODES,
} from "../modules/client-request/client-request.constants.js";
import { validateCreateClientRequestBody } from "../modules/client-request/client-request.validation.js";

const agentProfileId = new mongoose.Types.ObjectId().toString();
const secondAgentProfileId = new mongoose.Types.ObjectId().toString();

const validBounds = {
  northEast: { lat: 13.78, lng: 100.66 },
  southWest: { lat: 13.75, lng: 100.62 },
};

const validPosition = { lat: 13.73, lng: 100.54 };

const validLineGeometry = {
  type: "LineString",
  coordinates: [
    [100.6, 13.7],
    [100.7, 13.8],
  ],
};

const validMultiLineGeometry = {
  type: "MultiLineString",
  coordinates: [
    [
      [100.6, 13.7],
      [100.7, 13.8],
    ],
    [
      [100.7, 13.8],
      [100.8, 13.75],
    ],
  ],
};

const baseAreaBody = {
  name: "Sukhumvit 2BR",
  geoSearch: {
    mode: GEO_SEARCH_MODES.AREA,
    bounds: validBounds,
  },
};

const assertValidationError = (fn, messageMatcher = null) => {
  assert.throws(fn, (error) => {
    if (!(error instanceof AppError)) return false;
    if (error.statusCode !== 422) return false;
    if (error.code !== "VALIDATION_ERROR") return false;
    if (messageMatcher == null) return true;
    if (typeof messageMatcher === "string") {
      return error.message === messageMatcher;
    }
    return messageMatcher.test(error.message);
  });
};

test("validateCreateClientRequestBody accepts a full area search payload", () => {
  const result = validateCreateClientRequestBody({
    name: "  Sukhumvit 2BR  ",
    description: "  Near BTS  ",
    geoSearch: {
      mode: "area",
      bounds: validBounds,
      placeName: "  Phrom Phong  ",
      position: validPosition,
      radiusMeters: 500,
      geometry: validLineGeometry,
      distanceMeters: 750,
    },
    filters: {
      minRent: 15_000,
      maxRent: 35_000,
      bedroomCount: 2,
      bathroomCount: 1,
      kitchenType: "Kitchen",
      contractMonths: 6,
      occupancy: 2,
      isForeignerAccepted: true,
      isTM30Provided: true,
      isCookingAllowed: true,
      isPetAllowed: false,
      listingFacilities: ["Air Conditioner"],
      buildingType: "Condo",
      buildingFacilities: ["Parking", "Lift"],
      security: ["CCTV"],
      supportLanguages: ["English", "Thai"],
      agentProfileIds: [agentProfileId],
    },
  });

  assert.equal(result.name, "Sukhumvit 2BR");
  assert.equal(result.description, "Near BTS");
  assert.deepEqual(result.geoSearch, {
    mode: GEO_SEARCH_MODES.AREA,
    bounds: validBounds,
    placeName: "Phrom Phong",
  });
  assert.equal(result.filters.minRent, 15_000);
  assert.equal(result.filters.maxRent, 35_000);
  assert.equal(result.filters.bedroomCount, 2);
  assert.equal(result.filters.buildingType, "Condo");
  assert.deepEqual(result.filters.buildingFacilities, ["Parking", "Lift"]);
  assert.deepEqual(result.filters.supportLanguages, ["English", "Thai"]);
  assert.equal(result.filters.agentProfileIds.length, 1);
  assert.equal(String(result.filters.agentProfileIds[0]), agentProfileId);
  assert.equal(result.geoSearch.position, undefined);
  assert.equal(result.geoSearch.radiusMeters, undefined);
  assert.equal(result.geoSearch.geometry, undefined);
  assert.equal(result.geoSearch.distanceMeters, undefined);
});

test("validateCreateClientRequestBody accepts nearby and line modes", () => {
  const nearby = validateCreateClientRequestBody({
    name: "Pin search",
    geoSearch: {
      mode: GEO_SEARCH_MODES.NEARBY,
      position: validPosition,
      radiusMeters: 500,
    },
  });

  assert.deepEqual(nearby.geoSearch, {
    mode: GEO_SEARCH_MODES.NEARBY,
    position: validPosition,
    radiusMeters: 500,
    placeName: null,
  });
  assert.deepEqual(nearby.filters, {});
  assert.equal(nearby.description, null);

  const line = validateCreateClientRequestBody({
    name: "Line search",
    geoSearch: {
      mode: GEO_SEARCH_MODES.LINE,
      geometry: validLineGeometry,
      distanceMeters: 750,
      placeName: null,
    },
    filters: {},
  });

  assert.deepEqual(line.geoSearch, {
    mode: GEO_SEARCH_MODES.LINE,
    geometry: validLineGeometry,
    distanceMeters: 750,
    placeName: null,
  });

  const multiLine = validateCreateClientRequestBody({
    name: "Multi line",
    geoSearch: {
      mode: "line",
      geometry: validMultiLineGeometry,
      distanceMeters: GEO_SEARCH_MIN_DISTANCE_METERS,
    },
  });

  assert.equal(multiLine.geoSearch.geometry.type, "MultiLineString");
  assert.equal(
    multiLine.geoSearch.distanceMeters,
    GEO_SEARCH_MIN_DISTANCE_METERS,
  );
});

test("validateCreateClientRequestBody rejects non-object bodies", () => {
  for (const input of [null, undefined, "body", 1, true, []]) {
    assertValidationError(
      () => validateCreateClientRequestBody(input),
      "body must be an object",
    );
  }
});

test("validateCreateClientRequestBody requires geoSearch", () => {
  assertValidationError(
    () => validateCreateClientRequestBody({ name: "Missing geo" }),
    "geoSearch is required",
  );
  assertValidationError(
    () =>
      validateCreateClientRequestBody({
        name: "Null geo",
        geoSearch: null,
      }),
    "geoSearch is required",
  );
});

test("validateCreateClientRequestBody validates name", () => {
  for (const name of ["", "   ", 123, {}, [], null, undefined]) {
    assertValidationError(() =>
      validateCreateClientRequestBody({
        ...baseAreaBody,
        name,
      }),
    );
  }

  assertValidationError(
    () =>
      validateCreateClientRequestBody({
        ...baseAreaBody,
        name: "a".repeat(CLIENT_REQUEST_NAME_MAX_LENGTH + 1),
      }),
    `name must be at most ${CLIENT_REQUEST_NAME_MAX_LENGTH} characters`,
  );

  const atLimit = validateCreateClientRequestBody({
    ...baseAreaBody,
    name: "a".repeat(CLIENT_REQUEST_NAME_MAX_LENGTH),
  });
  assert.equal(atLimit.name.length, CLIENT_REQUEST_NAME_MAX_LENGTH);
});

test("validateCreateClientRequestBody normalizes optional description", () => {
  for (const description of [undefined, null, "", "   "]) {
    const result = validateCreateClientRequestBody({
      ...baseAreaBody,
      description,
    });
    assert.equal(result.description, null);
  }

  assertValidationError(() =>
    validateCreateClientRequestBody({
      ...baseAreaBody,
      description: 123,
    }),
  );

  assertValidationError(
    () =>
      validateCreateClientRequestBody({
        ...baseAreaBody,
        description: "a".repeat(CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH + 1),
      }),
    `description must be at most ${CLIENT_REQUEST_DESCRIPTION_MAX_LENGTH} characters`,
  );
});

test("validateCreateClientRequestBody validates geoSearch mode", () => {
  assertValidationError(
    () =>
      validateCreateClientRequestBody({
        name: "No mode",
        geoSearch: { bounds: validBounds },
      }),
    "mode is required",
  );

  for (const mode of ["", "map", "AREA", 1, {}, []]) {
    assertValidationError(() =>
      validateCreateClientRequestBody({
        name: "Bad mode",
        geoSearch: { mode, bounds: validBounds },
      }),
    );
  }
});

test("validateCreateClientRequestBody validates area bounds", () => {
  assertValidationError(
    () =>
      validateCreateClientRequestBody({
        name: "Area",
        geoSearch: { mode: "area" },
      }),
    "bounds must be an object",
  );

  assertValidationError(() =>
    validateCreateClientRequestBody({
      name: "Area",
      geoSearch: {
        mode: "area",
        bounds: {
          northEast: { lat: 13.75, lng: 100.66 },
          southWest: { lat: 13.78, lng: 100.62 },
        },
      },
    }),
  );

  assertValidationError(() =>
    validateCreateClientRequestBody({
      name: "Area",
      geoSearch: {
        mode: "area",
        bounds: {
          northEast: { lat: 13.78, lng: 100.62 },
          southWest: { lat: 13.75, lng: 100.66 },
        },
      },
    }),
  );

  assertValidationError(() =>
    validateCreateClientRequestBody({
      name: "Area",
      geoSearch: {
        mode: "area",
        bounds: {
          northEast: { lat: 91, lng: 100.66 },
          southWest: { lat: 13.75, lng: 100.62 },
        },
      },
    }),
  );
});

test("validateCreateClientRequestBody validates nearby position and radius", () => {
  assertValidationError(() =>
    validateCreateClientRequestBody({
      name: "Nearby",
      geoSearch: {
        mode: "nearby",
        radiusMeters: 500,
      },
    }),
  );

  assertValidationError(() =>
    validateCreateClientRequestBody({
      name: "Nearby",
      geoSearch: {
        mode: "nearby",
        position: validPosition,
      },
    }),
  );

  for (const position of [
    { lat: 91, lng: 100 },
    { lat: 13, lng: 181 },
    { lat: "13", lng: 100 },
    { lat: 13 },
    null,
  ]) {
    assertValidationError(() =>
      validateCreateClientRequestBody({
        name: "Nearby",
        geoSearch: {
          mode: "nearby",
          position,
          radiusMeters: 500,
        },
      }),
    );
  }

  for (const radiusMeters of [
    GEO_SEARCH_MIN_RADIUS_METERS - 1,
    GEO_SEARCH_MAX_RADIUS_METERS + 1,
    1.5,
    "500",
    null,
  ]) {
    assertValidationError(() =>
      validateCreateClientRequestBody({
        name: "Nearby",
        geoSearch: {
          mode: "nearby",
          position: validPosition,
          radiusMeters,
        },
      }),
    );
  }

  const atLimits = validateCreateClientRequestBody({
    name: "Nearby limits",
    geoSearch: {
      mode: "nearby",
      position: validPosition,
      radiusMeters: GEO_SEARCH_MAX_RADIUS_METERS,
    },
  });
  assert.equal(atLimits.geoSearch.radiusMeters, GEO_SEARCH_MAX_RADIUS_METERS);
});

test("validateCreateClientRequestBody validates line geometry and distance", () => {
  assertValidationError(() =>
    validateCreateClientRequestBody({
      name: "Line",
      geoSearch: {
        mode: "line",
        distanceMeters: 500,
      },
    }),
  );

  assertValidationError(() =>
    validateCreateClientRequestBody({
      name: "Line",
      geoSearch: {
        mode: "line",
        geometry: validLineGeometry,
      },
    }),
  );

  assertValidationError(() =>
    validateCreateClientRequestBody({
      name: "Line",
      geoSearch: {
        mode: "line",
        geometry: {
          type: "LineString",
          coordinates: [[100.6, 13.7]],
        },
        distanceMeters: 500,
      },
    }),
  );

  assertValidationError(() =>
    validateCreateClientRequestBody({
      name: "Line",
      geoSearch: {
        mode: "line",
        geometry: {
          type: "Point",
          coordinates: [100.6, 13.7],
        },
        distanceMeters: 500,
      },
    }),
  );

  for (const distanceMeters of [
    GEO_SEARCH_MIN_DISTANCE_METERS - 1,
    GEO_SEARCH_MAX_DISTANCE_METERS + 1,
    12.5,
    null,
  ]) {
    assertValidationError(() =>
      validateCreateClientRequestBody({
        name: "Line",
        geoSearch: {
          mode: "line",
          geometry: validLineGeometry,
          distanceMeters,
        },
      }),
    );
  }
});

test("validateCreateClientRequestBody validates placeName", () => {
  const blank = validateCreateClientRequestBody({
    ...baseAreaBody,
    geoSearch: {
      ...baseAreaBody.geoSearch,
      placeName: "   ",
    },
  });
  assert.equal(blank.geoSearch.placeName, null);

  assertValidationError(() =>
    validateCreateClientRequestBody({
      ...baseAreaBody,
      geoSearch: {
        ...baseAreaBody.geoSearch,
        placeName: 123,
      },
    }),
  );

  assertValidationError(
    () =>
      validateCreateClientRequestBody({
        ...baseAreaBody,
        geoSearch: {
          ...baseAreaBody.geoSearch,
          placeName: "a".repeat(CLIENT_REQUEST_PLACE_NAME_MAX_LENGTH + 1),
        },
      }),
    `placeName must be at most ${CLIENT_REQUEST_PLACE_NAME_MAX_LENGTH} characters`,
  );
});

test("validateCreateClientRequestBody validates filters object and rent range", () => {
  const omittedFilters = validateCreateClientRequestBody(baseAreaBody);
  assert.deepEqual(omittedFilters.filters, {});

  // null/undefined are treated as empty filters at the create boundary
  for (const filters of [null, undefined]) {
    const result = validateCreateClientRequestBody({
      ...baseAreaBody,
      filters,
    });
    assert.deepEqual(result.filters, {});
  }

  for (const filters of ["filters", 1, []]) {
    assertValidationError(() =>
      validateCreateClientRequestBody({
        ...baseAreaBody,
        filters,
      }),
    );
  }

  assertValidationError(
    () =>
      validateCreateClientRequestBody({
        ...baseAreaBody,
        filters: { minRent: 5000, maxRent: 1000 },
      }),
    "maxRent must be greater than or equal to minRent",
  );

  const equalRent = validateCreateClientRequestBody({
    ...baseAreaBody,
    filters: { minRent: 5000, maxRent: 5000 },
  });
  assert.equal(equalRent.filters.minRent, 5000);
  assert.equal(equalRent.filters.maxRent, 5000);
});

test("validateCreateClientRequestBody validates agent profile id filters", () => {
  assertValidationError(
    () =>
      validateCreateClientRequestBody({
        ...baseAreaBody,
        filters: {
          agentProfileIds: [agentProfileId],
          listerIds: [secondAgentProfileId],
        },
      }),
    "Use either agentProfileIds or listerIds, not both",
  );

  assertValidationError(() =>
    validateCreateClientRequestBody({
      ...baseAreaBody,
      filters: { agentProfileIds: ["not-an-id"] },
    }),
  );

  assertValidationError(() =>
    validateCreateClientRequestBody({
      ...baseAreaBody,
      filters: { agentProfileIds: agentProfileId },
    }),
  );

  const fromListerIds = validateCreateClientRequestBody({
    ...baseAreaBody,
    filters: { listerIds: [agentProfileId, agentProfileId] },
  });
  assert.equal(fromListerIds.filters.agentProfileIds.length, 1);
  assert.equal(String(fromListerIds.filters.agentProfileIds[0]), agentProfileId);
  assert.equal(fromListerIds.filters.listerIds, undefined);

  const emptyArraysOmitted = validateCreateClientRequestBody({
    ...baseAreaBody,
    filters: {
      agentProfileIds: [],
      listingFacilities: [],
      buildingFacilities: [],
      security: [],
    },
  });
  assert.deepEqual(emptyArraysOmitted.filters, {});

  // Empty supportLanguages is rejected by shared agent validation (search reuse).
  assertValidationError(
    () =>
      validateCreateClientRequestBody({
        ...baseAreaBody,
        filters: { supportLanguages: [] },
      }),
    "supportLanguages must contain at least one language",
  );
});

test("validateCreateClientRequestBody rejects invalid filter enums and types", () => {
  assertValidationError(() =>
    validateCreateClientRequestBody({
      ...baseAreaBody,
      filters: { buildingType: "Tower" },
    }),
  );

  assertValidationError(() =>
    validateCreateClientRequestBody({
      ...baseAreaBody,
      filters: { kitchenType: "Open Kitchen" },
    }),
  );

  assertValidationError(() =>
    validateCreateClientRequestBody({
      ...baseAreaBody,
      filters: { isForeignerAccepted: "yes" },
    }),
  );

  assertValidationError(() =>
    validateCreateClientRequestBody({
      ...baseAreaBody,
      filters: { bedroomCount: -1 },
    }),
  );
});
