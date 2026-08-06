import "dotenv/config";

import mongoose from "mongoose";

import { initializeEnvironment } from "../config/index.js";
import AgentProfile from "../modules/agent/agent-profile.model.js";
import Building from "../modules/building/building.model.js";
import {
  BUILDING_FACILITIES,
  BUILDING_SECURITY,
  BUILDING_TYPES,
} from "../modules/building/building.constants.js";
import Listing from "../modules/listing/listing.model.js";
import {
  KITCHEN_TYPES,
  LISTING_FACILITIES,
  LISTING_VISIBILITIES,
} from "../modules/listing/listing.constants.js";
import SavedSearch from "../modules/saved-search/saved-search.model.js";
import {
  GEO_SEARCH_MODES,
  SAVED_SEARCH_STATUSES,
} from "../modules/saved-search/saved-search.constants.js";
import User from "../modules/user/user.model.js";
import { USER_ROLES, USER_STATUSES } from "../modules/user/user.constants.js";
import { signAccessToken } from "../shared/auth/index.js";

const FIXTURE_PREFIX = "[ADO manual]";
const ALLOWED_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const FIXTURE_EMAILS = [
  "ado-agent@manual.test",
  "ado-platform@manual.test",
  "ado-thai-platform@manual.test",
  "ado-inactive-platform@manual.test",
  "ado-deleted-profile@manual.test",
  "ado-owner@manual.test",
];

const assertSafeDatabase = (uri) => {
  const parsed = new URL(uri);
  const databaseName = parsed.pathname.replace(/^\//, "");

  if (!ALLOWED_HOSTS.has(parsed.hostname) || !databaseName.endsWith("_manual_test")) {
    throw new Error(
      "Refusing to seed: use a local MongoDB database ending in _manual_test",
    );
  }

  return databaseName;
};

const areaSearch = (southWest, northEast, placeName) => ({
  mode: GEO_SEARCH_MODES.AREA,
  bounds: {
    southWest: { lng: southWest[0], lat: southWest[1] },
    northEast: { lng: northEast[0], lat: northEast[1] },
  },
  placeName,
});

const nearbySearch = (coordinates, radiusMeters, placeName) => ({
  mode: GEO_SEARCH_MODES.NEARBY,
  position: { lng: coordinates[0], lat: coordinates[1] },
  radiusMeters,
  placeName,
});

const lineSearch = (geometry, distanceMeters, placeName) => ({
  mode: GEO_SEARCH_MODES.LINE,
  geometry,
  distanceMeters,
  placeName,
});

const buildFixtures = (ownerId, profiles) => [
  {
    createdBy: ownerId,
    name: `${FIXTURE_PREFIX} Siam area`,
    description: "Waiting; overlaps central Bangkok polygon and point tests",
    geoSearch: areaSearch([100.528, 13.741], [100.542, 13.752], "Siam"),
    filters: { minRent: 15_000, maxRent: 30_000, bedroomCount: 1 },
  },
  {
    createdBy: ownerId,
    name: `${FIXTURE_PREFIX} Asok area`,
    description: "Waiting; east of Siam",
    geoSearch: areaSearch([100.555, 13.732], [100.57, 13.745], "Asok"),
    filters: { minRent: 20_000, isPetAllowed: true },
  },
  {
    createdBy: ownerId,
    name: `${FIXTURE_PREFIX} Ari area`,
    description: "Waiting; north-central Bangkok",
    geoSearch: areaSearch([100.535, 13.772], [100.549, 13.786], "Ari"),
    filters: { maxRent: 25_000, bedroomCount: 1 },
  },
  {
    createdBy: ownerId,
    name: `${FIXTURE_PREFIX} Riverside area`,
    description: "Waiting; west of central test polygon",
    geoSearch: areaSearch([100.49, 13.715], [100.515, 13.74], "Riverside"),
    filters: { minRent: 30_000, bedroomCount: 2 },
  },
  {
    createdBy: ownerId,
    name: `${FIXTURE_PREFIX} Phrom Phong nearby`,
    description: "Waiting; circular SavedSearch coverage",
    geoSearch: nearbySearch([100.569, 13.73], 1_500, "Phrom Phong"),
    filters: { minRent: 25_000, maxRent: 45_000 },
  },
  {
    createdBy: ownerId,
    name: `${FIXTURE_PREFIX} Sukhumvit line`,
    description: "Waiting; buffered LineString coverage",
    geoSearch: lineSearch(
      {
        type: "LineString",
        coordinates: [[100.535, 13.745], [100.56, 13.738], [100.585, 13.725]],
      },
      700,
      "Sukhumvit corridor",
    ),
    filters: { maxRent: 35_000, supportLanguages: ["English"] },
  },
  {
    createdBy: ownerId,
    name: `${FIXTURE_PREFIX} Two transit lines`,
    description: "Waiting; buffered MultiLineString coverage",
    geoSearch: lineSearch(
      {
        type: "MultiLineString",
        coordinates: [
          [[100.53, 13.75], [100.55, 13.76]],
          [[100.56, 13.72], [100.58, 13.74]],
        ],
      },
      500,
      "Transit corridors",
    ),
    filters: { maxRent: 40_000 },
  },
  {
    createdBy: ownerId,
    name: `${FIXTURE_PREFIX} Matching all filters`,
    description: "Expected counts: mine 1, platform 1, not capped",
    geoSearch: areaSearch([100.532, 13.743], [100.541, 13.751], "Focused Siam"),
    filters: {
      minRent: 15_000,
      maxRent: 30_000,
      contractMonths: 12,
      occupancy: 2,
      isForeignerAccepted: true,
      isTM30Provided: true,
      bedroomCount: 1,
      bathroomCount: 1,
      kitchenType: KITCHEN_TYPES.KITCHEN,
      isCookingAllowed: true,
      isPetAllowed: true,
      listingFacilities: [LISTING_FACILITIES.BALCONY],
      availableBy: new Date("2027-01-01T00:00:00.000Z"),
      buildingType: BUILDING_TYPES.APARTMENT,
      buildingFacilities: [BUILDING_FACILITIES.LIFT],
      security: [BUILDING_SECURITY.CCTV],
      supportLanguages: ["English"],
      agentProfileIds: [profiles.caller._id, profiles.platform._id],
    },
  },
  {
    createdBy: ownerId,
    name: `${FIXTURE_PREFIX} Platform profiles only`,
    description: "Expected counts: mine 0, platform 3, not capped",
    geoSearch: areaSearch([100.532, 13.743], [100.541, 13.751], "Focused Siam"),
    filters: {
      maxRent: 30_000,
      agentProfileIds: [profiles.platform._id],
    },
  },
  {
    createdBy: ownerId,
    name: `${FIXTURE_PREFIX} Thai profile only`,
    description: "Expected counts: mine 0, platform 1, not capped",
    geoSearch: areaSearch([100.532, 13.743], [100.541, 13.751], "Focused Siam"),
    filters: {
      maxRent: 30_000,
      supportLanguages: ["Thai"],
      agentProfileIds: [profiles.thaiPlatform._id],
    },
  },
  {
    createdBy: ownerId,
    name: `${FIXTURE_PREFIX} No matching listings`,
    description: "Expected counts: mine 0, platform 0, not capped",
    geoSearch: areaSearch([100.532, 13.743], [100.541, 13.751], "Focused Siam"),
    filters: { maxRent: 1_000 },
  },
  {
    createdBy: ownerId,
    name: `${FIXTURE_PREFIX} Twenty-building cap`,
    description: "Expected counts: mine 0, platform 20, capped true",
    geoSearch: areaSearch([100.695, 13.645], [100.705, 13.655], "Cap zone"),
    filters: {
      maxRent: 30_000,
      agentProfileIds: [profiles.platform._id],
    },
  },
  {
    createdBy: ownerId,
    name: `${FIXTURE_PREFIX} Chiang Mai far away`,
    description: "Waiting; deliberate non-match for Bangkok",
    geoSearch: areaSearch([98.975, 18.77], [99.005, 18.81], "Chiang Mai"),
    filters: { maxRent: 18_000 },
  },
  {
    createdBy: ownerId,
    name: `${FIXTURE_PREFIX} Closed Siam`,
    description: "Overlaps geographically but must be excluded by status",
    status: SAVED_SEARCH_STATUSES.CLOSED,
    geoSearch: areaSearch([100.53, 13.742], [100.54, 13.75], "Siam"),
    filters: { maxRent: 22_000 },
  },
  {
    createdBy: ownerId,
    name: `${FIXTURE_PREFIX} Deleted Siam`,
    description: "Overlaps geographically but must be excluded by soft delete",
    isDeleted: true,
    deletedAt: new Date(),
    geoSearch: areaSearch([100.53, 13.742], [100.54, 13.75], "Siam"),
    filters: { maxRent: 22_000 },
  },
];

const buildListingRecord = ({ buildingId, listedBy, ...overrides }) => ({
  buildingId,
  listedBy,
  visibility: LISTING_VISIBILITIES.PUBLIC,
  isForeignerAccepted: true,
  isTM30Provided: true,
  rent: 20_000,
  deposit: 20_000,
  moveInCost: 40_000,
  bedroomCount: 1,
  bathroomCount: 1,
  kitchenType: KITCHEN_TYPES.KITCHEN,
  contractMonths: 6,
  occupancy: 2,
  isCookingAllowed: true,
  isPetAllowed: true,
  facilities: [LISTING_FACILITIES.BALCONY],
  availableAt: new Date("2026-12-01T00:00:00.000Z"),
  ...overrides,
});

const seedMatchingBuildingsAndListings = async ({ users, ownerId }) => {
  const baseBuilding = {
    buildingType: BUILDING_TYPES.APARTMENT,
    facilities: [BUILDING_FACILITIES.LIFT],
    security: [BUILDING_SECURITY.CCTV],
    createdBy: ownerId,
  };
  const buildings = await Building.create([
    {
      ...baseBuilding,
      name: `${FIXTURE_PREFIX} My-priority building`,
      location: { type: "Point", coordinates: [100.535, 13.746] },
    },
    {
      ...baseBuilding,
      name: `${FIXTURE_PREFIX} Platform-only building`,
      location: { type: "Point", coordinates: [100.538, 13.748] },
    },
    {
      ...baseBuilding,
      name: `${FIXTURE_PREFIX} Thai-platform building`,
      location: { type: "Point", coordinates: [100.539, 13.749] },
    },
    {
      ...baseBuilding,
      name: `${FIXTURE_PREFIX} Inactive building`,
      isActive: false,
      location: { type: "Point", coordinates: [100.536, 13.747] },
    },
    {
      ...baseBuilding,
      name: `${FIXTURE_PREFIX} Wrong-facility building`,
      facilities: [BUILDING_FACILITIES.GYM],
      location: { type: "Point", coordinates: [100.537, 13.747] },
    },
    {
      ...baseBuilding,
      name: `${FIXTURE_PREFIX} Outside-area building`,
      location: { type: "Point", coordinates: [100.7, 13.8] },
    },
    {
      ...baseBuilding,
      name: `${FIXTURE_PREFIX} Private-listing building`,
      location: { type: "Point", coordinates: [100.5365, 13.7475] },
    },
    {
      ...baseBuilding,
      name: `${FIXTURE_PREFIX} Deleted-listing building`,
      location: { type: "Point", coordinates: [100.5375, 13.7485] },
    },
    {
      ...baseBuilding,
      name: `${FIXTURE_PREFIX} Inactive-agent building`,
      location: { type: "Point", coordinates: [100.5385, 13.7495] },
    },
    {
      ...baseBuilding,
      name: `${FIXTURE_PREFIX} Deleted-profile building`,
      location: { type: "Point", coordinates: [100.5395, 13.750] },
    },
  ]);

  const [mine, platform, thai, inactive, wrongFacility, outside, privateOnly, deletedOnly, inactiveAgent, deletedProfile] = buildings;
  await Listing.create([
    buildListingRecord({ buildingId: mine._id, listedBy: users.platform._id }),
    buildListingRecord({ buildingId: mine._id, listedBy: users.caller._id }),
    buildListingRecord({ buildingId: platform._id, listedBy: users.platform._id }),
    buildListingRecord({ buildingId: thai._id, listedBy: users.thaiPlatform._id }),
    buildListingRecord({ buildingId: inactive._id, listedBy: users.platform._id }),
    buildListingRecord({ buildingId: wrongFacility._id, listedBy: users.platform._id }),
    buildListingRecord({ buildingId: outside._id, listedBy: users.platform._id }),
    buildListingRecord({
      buildingId: privateOnly._id,
      listedBy: users.platform._id,
      visibility: LISTING_VISIBILITIES.PRIVATE,
    }),
    buildListingRecord({
      buildingId: deletedOnly._id,
      listedBy: users.platform._id,
      isDeleted: true,
      deletedAt: new Date(),
    }),
    buildListingRecord({ buildingId: inactiveAgent._id, listedBy: users.inactivePlatform._id }),
    buildListingRecord({ buildingId: deletedProfile._id, listedBy: users.deletedProfile._id }),
  ]);

  const capBuildings = await Building.create(
    Array.from({ length: 21 }, (_, index) => ({
      ...baseBuilding,
      name: `${FIXTURE_PREFIX} Cap building ${String(index + 1).padStart(2, "0")}`,
      location: {
        type: "Point",
        coordinates: [100.699 + index * 0.00002, 13.649 + index * 0.00002],
      },
    })),
  );
  await Listing.create(
    capBuildings.map((building) =>
      buildListingRecord({ buildingId: building._id, listedBy: users.platform._id }),
    ),
  );

  return { buildingCount: buildings.length + capBuildings.length };
};

const run = async () => {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error("MONGODB_URI is required");
  const databaseName = assertSafeDatabase(uri);
  initializeEnvironment();

  await mongoose.connect(uri);

  const fixtureUsers = await User.find({
    email: { $in: FIXTURE_EMAILS },
  }).select("_id");
  const fixtureUserIds = fixtureUsers.map(({ _id }) => _id);
  const fixtureBuildings = await Building.find({
    name: { $regex: /^\[ADO manual\]/ },
  }).select("_id");
  const fixtureBuildingIds = fixtureBuildings.map(({ _id }) => _id);

  await Listing.deleteMany({
    $or: [
      { buildingId: { $in: fixtureBuildingIds } },
      { listedBy: { $in: fixtureUserIds } },
    ],
  });
  await Promise.all([
    Building.deleteMany({ _id: { $in: fixtureBuildingIds } }),
    SavedSearch.deleteMany({
      $or: [
        { name: { $regex: /^\[ADO manual\]/ } },
        { createdBy: { $in: fixtureUserIds } },
      ],
    }),
    AgentProfile.deleteMany({ userId: { $in: fixtureUserIds } }),
  ]);
  await User.deleteMany({ _id: { $in: fixtureUserIds } });

  const [agent, platform, thaiPlatform, inactivePlatform, deletedProfile, owner] = await User.create([
    {
      name: "ADO Manual Agent",
      email: "ado-agent@manual.test",
      status: USER_STATUSES.ACTIVE,
      role: USER_ROLES.USER,
    },
    {
      name: "ADO Manual Platform Agent",
      email: "ado-platform@manual.test",
      status: USER_STATUSES.ACTIVE,
      role: USER_ROLES.USER,
    },
    {
      name: "ADO Manual Thai Platform Agent",
      email: "ado-thai-platform@manual.test",
      status: USER_STATUSES.ACTIVE,
      role: USER_ROLES.USER,
    },
    {
      name: "ADO Manual Inactive Platform Agent",
      email: "ado-inactive-platform@manual.test",
      status: USER_STATUSES.INACTIVE,
      role: USER_ROLES.USER,
    },
    {
      name: "ADO Manual Deleted-profile Agent",
      email: "ado-deleted-profile@manual.test",
      status: USER_STATUSES.ACTIVE,
      role: USER_ROLES.USER,
    },
    {
      name: "ADO Manual SavedSearch Owner",
      email: "ado-owner@manual.test",
      status: USER_STATUSES.ACTIVE,
      role: USER_ROLES.USER,
    },
  ]);

  const [agentProfile, platformProfile, thaiPlatformProfile] = await AgentProfile.create([
    {
      userId: agent._id,
      displayName: "ADO Manual Agent",
      supportLanguages: ["English", "Thai"],
    },
    {
      userId: platform._id,
      displayName: "ADO Manual Platform Agent",
      supportLanguages: ["English"],
    },
    {
      userId: thaiPlatform._id,
      displayName: "ADO Manual Thai Platform Agent",
      supportLanguages: ["Thai"],
    },
  ]);
  await AgentProfile.create([
    {
      userId: inactivePlatform._id,
      displayName: "ADO Manual Inactive Platform Agent",
      supportLanguages: ["English"],
    },
    {
      userId: deletedProfile._id,
      displayName: "ADO Manual Deleted-profile Agent",
      supportLanguages: ["English"],
      isDeleted: true,
      deletedAt: new Date(),
    },
  ]);
  const savedSearches = await SavedSearch.create(
    buildFixtures(owner._id, {
      caller: agentProfile,
      platform: platformProfile,
      thaiPlatform: thaiPlatformProfile,
    }),
  );
  const matchingFixtures = await seedMatchingBuildingsAndListings({
    users: {
      caller: agent,
      platform,
      thaiPlatform,
      inactivePlatform,
      deletedProfile,
    },
    ownerId: owner._id,
  });
  await Promise.all([
    SavedSearch.createIndexes(),
    Building.createIndexes(),
    Listing.createIndexes(),
  ]);

  const summary = {
    database: databaseName,
    agentUserId: agent._id,
    agentProfileId: agentProfile._id,
    accessToken: signAccessToken(agent),
    fixtureCount: savedSearches.length,
    buildingCount: matchingFixtures.buildingCount,
    listingCount: await Listing.countDocuments({
      listedBy: { $in: [agent._id, platform._id, thaiPlatform._id, inactivePlatform._id, deletedProfile._id] },
    }),
    fixtures: savedSearches.map(({ _id, name, status, isDeleted }) => ({
      id: _id,
      name,
      status,
      isDeleted,
    })),
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
};

try {
  await run();
} finally {
  await mongoose.disconnect();
}
