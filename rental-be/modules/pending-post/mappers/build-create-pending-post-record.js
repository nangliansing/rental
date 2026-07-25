import { validateObject } from "../../../shared/validators/index.js";
import { PENDING_POST_STATUSES } from "../pending-post.constants.js";
import {
  validateExistingBuildingId,
  validatePendingBuilding,
  validatePendingListing,
  validatePendingPostBuildingSource,
  validateSubmittedBy,
} from "../pending-post.validation.js";

export const buildCreatePendingPostRecord = (body, actorId) => {
  validateObject(body, "body");

  const submittedBy = validateSubmittedBy(actorId);
  const existingBuildingId = validateExistingBuildingId(
    body.existingBuildingId,
  );
  const building = validatePendingBuilding(body.building);
  const listing = validatePendingListing(body.listing);

  validatePendingPostBuildingSource({
    existingBuildingId,
    building,
  });

  return {
    status: PENDING_POST_STATUSES.PENDING,
    submittedBy,
    existingBuildingId,
    building,
    listing,
    reviewNote: null,
    reviewedBy: null,
    reviewedAt: null,
    approvedBuildingId: null,
    approvedListingId: null,
  };
};
