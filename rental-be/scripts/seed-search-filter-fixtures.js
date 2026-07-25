import dotenv from "dotenv";
import mongoose from "mongoose";

import AgentProfile from "../modules/agent/agent-profile.model.js";
import Building from "../modules/building/building.model.js";
import Listing from "../modules/listing/listing.model.js";
import User from "../modules/user/user.model.js";

dotenv.config();

const FIXTURE_PREFIX = "Search Filter Fixture -";
const LISTER_EMAIL = "test.normal.user@example.com";
const CREATOR_EMAIL = "test.owner.user@example.com";

const fixturePhoto = (slug, alt) => ({
  publicId: `search-filter-fixtures/${slug}`,
  secureUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
  resourceType: "image",
  format: "jpg",
  width: 800,
  height: 600,
  bytes: 120000,
  position: 0,
  alt,
  isCover: true,
});

const baseListing = {
  visibility: "PUBLIC",
  isForeignerAccepted: true,
  isTM30Provided: true,
  rent: 12000,
  deposit: 24000,
  moveInCost: 36000,
  electricRate: 8,
  waterRate: 20,
  bedroomCount: 1,
  bathroomCount: 1,
  kitchenType: "Kitchen",
  size: 32,
  contractMonths: 12,
  occupancy: 2,
  isCookingAllowed: true,
  isPetAllowed: false,
  facilities: ["Air Conditioner", "Balcony"],
  media: [fixturePhoto("base-room", "Search filter fixture room")],
  description: "Search filter fixture listing.",
  isDeleted: false,
  deletedAt: null,
  deletedBy: null,
  deleteReason: null,
};

const fixtures = [
  {
    key: "budget-apartment",
    building: {
      name: `${FIXTURE_PREFIX}Budget Apartment`,
      buildingType: "Apartment",
      facilities: ["Parking", "Lift"],
      security: ["CCTV", "Keycard Access"],
      location: { type: "Point", coordinates: [100.641, 13.765] },
      address: "Lat Phrao Road, Bang Kapi, Bangkok",
      isActive: true,
    },
    listings: [
      {
        ...baseListing,
        rent: 6500,
        deposit: 6500,
        moveInCost: 13000,
        bedroomCount: 0,
        kitchenType: "No Kitchen",
        size: 21,
        contractMonths: 3,
        occupancy: 1,
        isCookingAllowed: false,
        facilities: ["Fan", "Desk"],
        media: [fixturePhoto("budget-apartment-studio", "Budget apartment studio")],
        description: "Low budget studio fixture.",
      },
      {
        ...baseListing,
        rent: 9000,
        deposit: 18000,
        moveInCost: 27000,
        contractMonths: 6,
        occupancy: 1,
        size: 28,
        media: [fixturePhoto("budget-apartment", "Budget apartment room")],
        description: "Budget public apartment fixture.",
      },
      {
        ...baseListing,
        rent: 12500,
        deposit: 25000,
        moveInCost: 37500,
        bedroomCount: 2,
        bathroomCount: 1,
        size: 42,
        occupancy: 3,
        facilities: ["Air Conditioner", "Refrigerator", "Balcony"],
        media: [fixturePhoto("budget-apartment-two-bedroom", "Budget apartment two bedroom")],
        description: "Budget apartment two-bedroom fixture.",
      },
    ],
  },
  {
    key: "pet-condo",
    building: {
      name: `${FIXTURE_PREFIX}Pet Condo`,
      buildingType: "Condo",
      facilities: ["Parking", "Gym", "Swimming Pool"],
      security: ["Security Guard", "Keycard Access"],
      location: { type: "Point", coordinates: [100.642, 13.7656] },
      address: "Lat Phrao Road, Bang Kapi, Bangkok",
      isActive: true,
    },
    listings: [
      {
        ...baseListing,
        rent: 14500,
        deposit: 29000,
        moveInCost: 43500,
        bedroomCount: 1,
        bathroomCount: 1,
        size: 34,
        occupancy: 2,
        isPetAllowed: false,
        facilities: ["Air Conditioner", "Washing Machine"],
        media: [fixturePhoto("pet-condo-standard", "Pet condo standard room")],
        description: "Condo fixture that does not allow pets.",
      },
      {
        ...baseListing,
        rent: 18000,
        deposit: 36000,
        moveInCost: 54000,
        bedroomCount: 2,
        bathroomCount: 2,
        kitchenType: "Separate Kitchen",
        size: 48,
        occupancy: 3,
        isPetAllowed: true,
        facilities: ["Air Conditioner", "Washing Machine", "Balcony"],
        media: [fixturePhoto("pet-condo", "Pet friendly condo room")],
        description: "Pet friendly condo fixture.",
      },
      {
        ...baseListing,
        rent: 22000,
        deposit: 44000,
        moveInCost: 66000,
        bedroomCount: 2,
        bathroomCount: 2,
        kitchenType: "Separate Kitchen",
        size: 56,
        occupancy: 4,
        isPetAllowed: true,
        facilities: [
          "Air Conditioner",
          "Refrigerator",
          "Washing Machine",
          "Water Heater",
          "Balcony",
        ],
        media: [fixturePhoto("pet-condo-premium", "Pet condo premium room")],
        description: "Premium pet friendly condo fixture.",
      },
    ],
  },
  {
    key: "student-dormitory",
    building: {
      name: `${FIXTURE_PREFIX}Student Dormitory`,
      buildingType: "Dormitory",
      facilities: ["Wifi", "Laundry"],
      security: ["CCTV", "Smoke Detector"],
      location: { type: "Point", coordinates: [100.643, 13.7662] },
      address: "Lat Phrao Road, Bang Kapi, Bangkok",
      isActive: true,
    },
    listings: [
      {
        ...baseListing,
        isForeignerAccepted: false,
        isTM30Provided: false,
        rent: 5200,
        deposit: 5200,
        moveInCost: 10400,
        bedroomCount: 0,
        kitchenType: "No Kitchen",
        size: 18,
        contractMonths: 1,
        occupancy: 1,
        isCookingAllowed: false,
        facilities: ["Fan", "Desk"],
        media: [fixturePhoto("student-dormitory-mini", "Student dormitory mini room")],
        description: "Short-contract student dormitory fixture.",
      },
      {
        ...baseListing,
        isForeignerAccepted: false,
        isTM30Provided: false,
        rent: 6500,
        deposit: 6500,
        moveInCost: 13000,
        bedroomCount: 0,
        kitchenType: "No Kitchen",
        size: 22,
        contractMonths: 3,
        occupancy: 1,
        isCookingAllowed: false,
        facilities: ["Fan", "Desk", "Chair"],
        media: [fixturePhoto("student-dormitory", "Student dormitory room")],
        description: "Student dormitory fixture.",
      },
      {
        ...baseListing,
        isForeignerAccepted: true,
        isTM30Provided: true,
        rent: 8200,
        deposit: 16400,
        moveInCost: 24600,
        bedroomCount: 1,
        kitchenType: "No Kitchen",
        size: 26,
        contractMonths: 6,
        occupancy: 2,
        isCookingAllowed: false,
        facilities: ["Air Conditioner", "Desk", "Chair", "Private Bathroom"],
        media: [fixturePhoto("student-dormitory-ac", "Student dormitory air conditioned room")],
        description: "Foreigner-friendly dormitory fixture.",
      },
    ],
  },
  {
    key: "family-apartment",
    building: {
      name: `${FIXTURE_PREFIX}Family Apartment`,
      buildingType: "Apartment",
      facilities: ["Parking", "Lift", "Gym"],
      security: ["CCTV", "Security Guard", "Fire Alarm"],
      location: { type: "Point", coordinates: [100.644, 13.7668] },
      address: "Lat Phrao Road, Bang Kapi, Bangkok",
      isActive: true,
    },
    listings: [
      {
        ...baseListing,
        rent: 21000,
        deposit: 42000,
        moveInCost: 63000,
        bedroomCount: 2,
        bathroomCount: 2,
        kitchenType: "Separate Kitchen",
        size: 58,
        occupancy: 4,
        isPetAllowed: false,
        facilities: ["Air Conditioner", "Refrigerator", "Washing Machine"],
        media: [fixturePhoto("family-apartment-compact", "Compact family apartment room")],
        description: "Compact family apartment fixture.",
      },
      {
        ...baseListing,
        rent: 25000,
        deposit: 50000,
        moveInCost: 75000,
        bedroomCount: 3,
        bathroomCount: 2,
        kitchenType: "Separate Kitchen",
        size: 72,
        occupancy: 5,
        isPetAllowed: true,
        facilities: [
          "Air Conditioner",
          "Refrigerator",
          "Washing Machine",
          "Cooking Equipment",
        ],
        media: [fixturePhoto("family-apartment", "Family apartment room")],
        description: "Family apartment fixture.",
      },
      {
        ...baseListing,
        rent: 32000,
        deposit: 64000,
        moveInCost: 96000,
        bedroomCount: 4,
        bathroomCount: 3,
        kitchenType: "Separate Kitchen",
        size: 96,
        occupancy: 6,
        isPetAllowed: true,
        facilities: [
          "Air Conditioner",
          "Refrigerator",
          "Washing Machine",
          "Water Heater",
          "Sofa",
          "Cooking Equipment",
          "Balcony",
        ],
        media: [fixturePhoto("family-apartment-large", "Large family apartment room")],
        description: "Large family apartment fixture.",
      },
    ],
  },
  {
    key: "private-only",
    building: {
      name: `${FIXTURE_PREFIX}Private Only Building`,
      buildingType: "Apartment",
      facilities: ["Parking", "Lift"],
      security: ["CCTV"],
      location: { type: "Point", coordinates: [100.645, 13.7674] },
      address: "Lat Phrao Road, Bang Kapi, Bangkok",
      isActive: true,
    },
    listings: [
      {
        ...baseListing,
        visibility: "PRIVATE",
        rent: 11000,
        media: [fixturePhoto("private-only", "Private only room")],
        description: "Private listing fixture; should be hidden from public search.",
      },
    ],
  },
  {
    key: "deleted-listing",
    building: {
      name: `${FIXTURE_PREFIX}Deleted Listing Building`,
      buildingType: "Mansion",
      facilities: ["Parking"],
      security: ["CCTV"],
      location: { type: "Point", coordinates: [100.646, 13.768] },
      address: "Lat Phrao Road, Bang Kapi, Bangkok",
      isActive: true,
    },
    listings: [
      {
        ...baseListing,
        rent: 10000,
        media: [fixturePhoto("deleted-listing", "Deleted fixture room")],
        description: "Deleted listing fixture; should be hidden from public search.",
        isDeleted: true,
        deletedAt: new Date(),
      },
    ],
  },
  {
    key: "inactive-building",
    building: {
      name: `${FIXTURE_PREFIX}Inactive Building`,
      buildingType: "Condo",
      facilities: ["Parking", "Gym"],
      security: ["Security Guard"],
      location: { type: "Point", coordinates: [100.647, 13.7686] },
      address: "Lat Phrao Road, Bang Kapi, Bangkok",
      isActive: false,
    },
    listings: [
      {
        ...baseListing,
        rent: 16000,
        media: [fixturePhoto("inactive-building", "Inactive building room")],
        description: "Public listing in inactive building; should be hidden.",
      },
    ],
  },
];

const calculateRentSummary = (listings) => {
  const publicRents = listings
    .filter((listing) => listing.visibility === "PUBLIC" && !listing.isDeleted)
    .map((listing) => listing.rent);

  if (publicRents.length === 0) {
    return { minRent: null, maxRent: null };
  }

  return {
    minRent: Math.min(...publicRents),
    maxRent: Math.max(...publicRents),
  };
};

const run = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const session = await mongoose.startSession();

  try {
    const result = await session.withTransaction(async () => {
      const [lister, creator] = await Promise.all([
        User.findOne({ email: LISTER_EMAIL }).session(session),
        User.findOne({ email: CREATOR_EMAIL }).session(session),
      ]);

      if (!lister) {
        throw new Error(`Missing fixture lister: ${LISTER_EMAIL}`);
      }

      if (!creator) {
        throw new Error(`Missing fixture creator: ${CREATOR_EMAIL}`);
      }

      await User.updateOne(
        { _id: lister._id },
        { $set: { status: "ACTIVE" } },
        { session },
      );

      await AgentProfile.updateOne(
        { userId: lister._id },
        {
          $set: {
            isOnline: true,
            isDeleted: false,
            deletedAt: null,
            deletedBy: null,
            deleteReason: null,
          },
        },
        { session },
      );

      const existingBuildings = await Building.find({
        name: { $in: fixtures.map((fixture) => fixture.building.name) },
      })
        .select("_id")
        .session(session);

      await Listing.deleteMany({
        buildingId: { $in: existingBuildings.map((building) => building._id) },
      }).session(session);

      const seeded = [];

      for (const fixture of fixtures) {
        const rentSummary = calculateRentSummary(fixture.listings);
        const building = await Building.findOneAndUpdate(
          { name: fixture.building.name },
          {
            $set: {
              ...fixture.building,
              ...rentSummary,
              createdBy: creator._id,
              updatedBy: creator._id,
            },
          },
          {
            returnDocument: "after",
            upsert: true,
            setDefaultsOnInsert: true,
            session,
          },
        );

        const listingRecords = fixture.listings.map((listing) => ({
          ...listing,
          listedBy: lister._id,
          buildingId: building._id,
          deletedBy: listing.isDeleted ? lister._id : null,
        }));

        const listings = await Listing.create(listingRecords, {
          ordered: true,
          session,
        });

        seeded.push({
          key: fixture.key,
          buildingId: building._id.toString(),
          listingIds: listings.map((listing) => listing._id.toString()),
          visibleInPublicSearch:
            fixture.building.isActive &&
            fixture.listings.some(
              (listing) => listing.visibility === "PUBLIC" && !listing.isDeleted,
            ),
        });
      }

      return seeded;
    });

    console.log(JSON.stringify({ success: true, data: result }, null, 2));
  } finally {
    await session.endSession();
    await mongoose.disconnect();
  }
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
