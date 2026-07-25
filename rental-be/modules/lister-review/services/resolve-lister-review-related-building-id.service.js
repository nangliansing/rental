import { AppError } from "../../../shared/errors/app-error.js";

import Building from "../../building/building.model.js";
import Listing from "../../listing/listing.model.js";

const assertRelatedBuildingMatchesListing = ({
  requestedBuildingId,
  listingBuildingId,
}) => {
  if (!requestedBuildingId) return;

  if (requestedBuildingId.toString() === listingBuildingId.toString()) return;

  throw new AppError(
    "relatedBuildingId must match relatedListingId building",
    422,
    "VALIDATION_ERROR",
  );
};

const assertNoBuildingWhenClearingListing = ({ relatedBuildingId }) => {
  if (!relatedBuildingId) return;

  throw new AppError(
    "relatedBuildingId must be null when relatedListingId is null",
    422,
    "VALIDATION_ERROR",
  );
};

export const resolveListerReviewRelatedBuildingId = async ({
  relatedListingId,
  relatedBuildingId,
  listerUserId,
  session,
  clearBuildingWhenListingCleared = false,
}) => {
  const hasRelatedListingInput = relatedListingId !== undefined;
  const hasRelatedBuildingInput = relatedBuildingId !== undefined;

  if (!hasRelatedListingInput && !hasRelatedBuildingInput) {
    return undefined;
  }

  if (relatedListingId) {
    const listingQuery = Listing.findOne({
      _id: relatedListingId,
      listedBy: listerUserId,
      isDeleted: { $ne: true },
    }).select("_id buildingId");

    if (session) {
      listingQuery.session(session);
    }

    const listing = await listingQuery;

    if (!listing) {
      throw new AppError(
        "Related listing not found",
        404,
        "RELATED_LISTING_NOT_FOUND",
      );
    }

    assertRelatedBuildingMatchesListing({
      requestedBuildingId: relatedBuildingId,
      listingBuildingId: listing.buildingId,
    });

    return listing.buildingId;
  }

  if (relatedListingId === null && clearBuildingWhenListingCleared) {
    assertNoBuildingWhenClearingListing({ relatedBuildingId });

    return null;
  }

  if (!relatedBuildingId) return null;

  const buildingQuery = Building.findOne({
    _id: relatedBuildingId,
    isActive: true,
  }).select("_id");
  const listingInBuildingQuery = Listing.findOne({
    buildingId: relatedBuildingId,
    listedBy: listerUserId,
    isDeleted: { $ne: true },
  }).select("_id");

  if (session) {
    buildingQuery.session(session);
    listingInBuildingQuery.session(session);
  }

  const [building, listingInBuilding] = await Promise.all([
    buildingQuery,
    listingInBuildingQuery,
  ]);

  if (!building || !listingInBuilding) {
    throw new AppError(
      "Related building not found",
      404,
      "RELATED_BUILDING_NOT_FOUND",
    );
  }

  return relatedBuildingId;
};
