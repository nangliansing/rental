import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import SavedListing from "../saved-listing.model.js";
import { validateSavedListingListingId } from "../saved-listing.validation.js";

const DELETED_SAVED_LISTING_SELECT =
  "_id userId listingId buildingId listedBy snapshot createdAt updatedAt";

const throwSavedListingNotFound = () => {
  throw new AppError(
    "Saved listing not found",
    404,
    "SAVED_LISTING_NOT_FOUND",
  );
};

export const deleteSavedListingService = async ({
  listingId: listingIdInput,
  actorId,
  session = null,
}) => {
  validateNullableObject(session, "session");

  const userId = validateMongooseId(actorId, "userId", { asObjectId: true });
  const listingId = validateSavedListingListingId(listingIdInput);

  const deleteQuery = SavedListing.findOneAndDelete({
    userId,
    listingId,
  }).select(DELETED_SAVED_LISTING_SELECT);

  if (session) {
    deleteQuery.session(session);
  }

  const savedListing = await deleteQuery;

  if (!savedListing) {
    throwSavedListingNotFound();
  }

  return savedListing;
};
