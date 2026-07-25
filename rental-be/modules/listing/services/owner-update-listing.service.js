import mongoose from "mongoose";

import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";

import { AppError } from "../../../shared/errors/app-error.js";
import { updateBuildingRentSummaryService } from "../../building/services/index.js";
import { buildOwnerUpdateListingRecord } from "../mappers/index.js";
import Listing from "../listing.model.js";

const updateOwnerListing = async ({ listingId, actorId, body, session }) => {
  const ownerListingFilter = {
    _id: listingId,
    listedBy: actorId,
    isDeleted: false,
  };

  let existingQuery = Listing.findOne(ownerListingFilter);

  if (session) {
    existingQuery = existingQuery.session(session);
  }

  const existingListing = await existingQuery;

  if (!existingListing) {
    throw new AppError("Listing not found", 404, "LISTING_NOT_FOUND");
  }

  const update = buildOwnerUpdateListingRecord({
    body,
    listing: existingListing,
  });

  let updateQuery = Listing.findOneAndUpdate(
    ownerListingFilter,
    { $set: update },
    {
      returnDocument: "after",
      runValidators: true,
    },
  );

  if (session) {
    updateQuery = updateQuery.session(session);
  }

  const listing = await updateQuery;

  if (!listing) {
    throw new AppError("Listing not found", 404, "LISTING_NOT_FOUND");
  }

  if (Object.hasOwn(update, "rent") || Object.hasOwn(update, "visibility")) {
    await updateBuildingRentSummaryService(listing.buildingId, session);
  }

  return listing;
};

export const ownerUpdateListingService = async ({
  listingId,
  body,
  actorId,
  session = null,
}) => {
  validateNullableObject(session, "session");

  const validatedListingId = validateMongooseId(listingId, "listingId");
  const validatedActorId = validateMongooseId(actorId, "actorId");

  if (session) {
    return updateOwnerListing({
      listingId: validatedListingId,
      actorId: validatedActorId,
      body,
      session,
    });
  }

  const transactionSession = await mongoose.startSession();

  try {
    let listing;

    await transactionSession.withTransaction(async () => {
      listing = await updateOwnerListing({
        listingId: validatedListingId,
        actorId: validatedActorId,
        body,
        session: transactionSession,
      });
    });

    return listing;
  } finally {
    await transactionSession.endSession();
  }
};
