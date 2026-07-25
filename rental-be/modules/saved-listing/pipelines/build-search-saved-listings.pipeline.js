// modules/saved-listing/pipelines/build-search-saved-listings.pipeline.js
import { COLLECTION_NAMES } from "../../../shared/constants/index.js";
import {
  ACTIVE_BUILDING_FILTER,
  PUBLIC_BUILDING_DETAIL_SELECT,
} from "../../building/services/building-query.constants.js";
import { LISTING_VISIBILITIES } from "../../listing/listing.constants.js";
import { buildAgentProfileFromListingLookupStages } from "../../search/pipelines/helpers/index.js";
import {
  LIVE_SAVED_LISTING_PROJECT,
  SAVED_LISTING_SORT,
  SEARCH_SAVED_LISTING_PROJECT,
} from "./saved-listing-pipeline.constants.js";

const PUBLIC_BUILDING_DETAIL_PROJECT = Object.fromEntries(
  PUBLIC_BUILDING_DETAIL_SELECT.split(" ").map((field) => [field, 1]),
);

export const buildSearchSavedListingsPipeline = ({
  userId,
  page = 1,
  limit = 20,
}) => {
  const skip = (page - 1) * limit;

  return [
    {
      $match: {
        userId,
      },
    },
    {
      $sort: SAVED_LISTING_SORT,
    },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: COLLECTION_NAMES.Listings,
              let: { listingId: "$listingId" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$_id", "$$listingId"] },
                    isDeleted: false,
                    $or: [
                      { visibility: LISTING_VISIBILITIES.PUBLIC },
                      { listedBy: userId },
                    ],
                  },
                },
                {
                  $lookup: {
                    from: COLLECTION_NAMES.Buildings,
                    let: { buildingId: "$buildingId" },
                    pipeline: [
                      {
                        $match: {
                          $expr: { $eq: ["$_id", "$$buildingId"] },
                          ...ACTIVE_BUILDING_FILTER,
                        },
                      },
                      { $project: PUBLIC_BUILDING_DETAIL_PROJECT },
                    ],
                    as: "building",
                  },
                },
                {
                  $unwind: {
                    path: "$building",
                    preserveNullAndEmptyArrays: false,
                  },
                },
                ...buildAgentProfileFromListingLookupStages({
                  removeAgentProfile: false,
                  preserveNullAndEmptyArrays: true,
                  requireAgentProfile: false,
                  requireActiveUser: true,
                }),
                {
                  $addFields: {
                    agentProfile: {
                      $ifNull: ["$agentProfile", null],
                    },
                  },
                },
                {
                  $project: LIVE_SAVED_LISTING_PROJECT,
                },
              ],
              as: "listing",
            },
          },
          {
            $unwind: {
              path: "$listing",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $addFields: {
              listing: {
                $cond: [
                  { $ne: [{ $ifNull: ["$listing._id", null] }, null] },
                  {
                    $mergeObjects: [
                      "$listing",
                      {
                        isSavedByMe: true,
                      },
                    ],
                  },
                  null,
                ],
              },
            },
          },
          {
            $project: SEARCH_SAVED_LISTING_PROJECT,
          },
        ],
        pagination: [{ $count: "total" }],
      },
    },
    {
      $project: {
        data: 1,
        pagination: {
          page: { $literal: page },
          limit: { $literal: limit },
          total: {
            $ifNull: [{ $arrayElemAt: ["$pagination.total", 0] }, 0],
          },
        },
      },
    },
  ];
};
