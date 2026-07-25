// modules/search/pipelines/helpers/build-saved-listing-lookup-stages.js
import { COLLECTION_NAMES } from "../../../../shared/constants/index.js";

export const buildSavedListingLookupStages = (viewerUserId = null) => {
  if (!viewerUserId) {
    return [
      {
        $addFields: {
          isSavedByMe: false,
        },
      },
    ];
  }

  return [
    {
      $lookup: {
        from: COLLECTION_NAMES.SavedListings,
        let: { listingId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$listingId", "$$listingId"] },
                  { $eq: ["$userId", viewerUserId] },
                ],
              },
            },
          },
          { $limit: 1 },
          { $project: { _id: 1 } },
        ],
        as: "_savedByMe",
      },
    },
    {
      $addFields: {
        isSavedByMe: { $gt: [{ $size: "$_savedByMe" }, 0] },
      },
    },
    {
      $project: {
        _savedByMe: 0,
      },
    },
  ];
};
