// modules/listing/pipelines/helpers/build-building-from-listing-lookup-stages.js
import { COLLECTION_NAMES } from "../../../../shared/constants/index.js";

export const buildBuildingFromListingLookupStages = ({
    preserveNullAndEmptyArrays = true,
    requireActive = false,
    includeRentSummary = false,
} = {}) => {
    const project = {
        name: 1,
        isActive: 1,
        buildingType: 1,
        facilities: 1,
        security: 1,
        location: 1,
        address: 1,
    };

    if (includeRentSummary) {
        project.minRent = 1;
        project.maxRent = 1;
    }

    const stages = [
        {
            $lookup: {
                from: COLLECTION_NAMES.Buildings,
                let: { buildingId: "$buildingId" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$_id", "$$buildingId"] },
                            ...(requireActive ? { isActive: true } : {}),
                        },
                    },
                    {
                        $project: project,
                    },
                ],
                as: "building",
            },
        },
        {
            $unwind: {
                path: "$building",
                preserveNullAndEmptyArrays,
            },
        },
    ];

    if (preserveNullAndEmptyArrays) {
        stages.push({
            $set: {
                building: { $ifNull: ["$building", null] },
            },
        });
    }

    return stages;
};
