import { COLLECTION_NAMES } from "../../../shared/constants/index.js";

export const buildExistingBuildingLookupStages = () => [
  {
    $lookup: {
      from: COLLECTION_NAMES.Buildings,
      localField: "existingBuildingId",
      foreignField: "_id",
      pipeline: [
        {
          $project: {
            name: 1,
            buildingType: 1,
            facilities: 1,
            security: 1,
            location: 1,
            address: 1,
            minRent: 1,
            maxRent: 1,
            isActive: 1,
          },
        },
      ],
      as: "existingBuilding",
    },
  },
  {
    $unwind: {
      path: "$existingBuilding",
      preserveNullAndEmptyArrays: true,
    },
  },
];
