import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import Building from "../../building/building.model.js";
import { ACTIVE_BUILDING_FILTER } from "../../building/services/building-query.constants.js";
import Listing from "../../listing/listing.model.js";
import { LISTING_VISIBILITIES } from "../../listing/listing.constants.js";

import SavedListing from "../saved-listing.model.js";
import { validateSavedListingListingId } from "../saved-listing.validation.js";
import { buildCreateSavedListingRecord } from "../mappers/index.js";

const SAVABLE_LISTING_SELECT = "_id buildingId listedBy rent visibility media";
const SAVED_LISTING_DUPLICATE_SELECT = "_id";
const SAVED_LISTING_BUILDING_SELECT = "_id name";

const isDuplicateSavedListingError = (error) => {
  return error?.code === 11000;
};

const throwSavedListingAlreadyExists = () => {
  throw new AppError(
    "Listing is already saved",
    409,
    "SAVED_LISTING_ALREADY_EXISTS",
  );
};

const findExistingSavedListing = ({ userId, listingId, session }) => {
  const query = SavedListing.findOne({
    userId,
    listingId,
  })
    .select(SAVED_LISTING_DUPLICATE_SELECT)
    .lean();

  return session ? query.session(session) : query;
};

const findSavableListing = ({ listingId, session }) => {
  const query = Listing.findOne({
    _id: listingId,
    isDeleted: { $ne: true },
    visibility: LISTING_VISIBILITIES.PUBLIC,
  })
    .select(SAVABLE_LISTING_SELECT)
    .lean();

  return session ? query.session(session) : query;
};

const findActiveBuildingForSavedListing = ({ buildingId, session }) => {
  const query = Building.findOne({
    _id: buildingId,
    ...ACTIVE_BUILDING_FILTER,
  })
    .select(SAVED_LISTING_BUILDING_SELECT)
    .lean();

  return session ? query.session(session) : query;
};

export const createSavedListingService = async ({
  listingId: listingIdInput,
  actorId,
  session = null,
}) => {
  validateNullableObject(session, "session");

  const userId = validateMongooseId(actorId, "userId", { asObjectId: true });
  const listingId = validateSavedListingListingId(listingIdInput);

  const existingSavedListing = await findExistingSavedListing({
    userId,
    listingId,
    session,
  });

  if (existingSavedListing) {
    throwSavedListingAlreadyExists();
  }

  const listing = await findSavableListing({ listingId, session });

  if (!listing) {
    throw new AppError("Listing not found", 404, "LISTING_NOT_FOUND");
  }

  const building = await findActiveBuildingForSavedListing({
    buildingId: listing.buildingId,
    session,
  });

  if (!building) {
    throw new AppError("Building not found", 404, "BUILDING_NOT_FOUND");
  }

  try {
    const [savedListing] = await SavedListing.create(
      [
        buildCreateSavedListingRecord({
          userId,
          listing,
          building,
        }),
      ],
      session ? { session } : undefined,
    );

    return savedListing;
  } catch (error) {
    if (isDuplicateSavedListingError(error)) {
      throwSavedListingAlreadyExists();
    }

    throw error;
  }
};
