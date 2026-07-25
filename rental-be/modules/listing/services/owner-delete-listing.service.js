// modules/listing/services/owner-delete-listing.service.js
import mongoose from "mongoose";

import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";

import { AppError } from "../../../shared/errors/app-error.js";
import { updateBuildingRentSummaryService } from "../../building/services/index.js";
import { LISTING_VISIBILITIES } from "../listing.constants.js";
import Listing from "../listing.model.js";

const deleteOwnerListing = async ({ listingId, actorId, session }) => {
  const deletedAt = new Date();

  let deleteQuery = Listing.findOneAndUpdate(
    {
      _id: listingId,
      listedBy: actorId,
      isDeleted: false,
    },
    {
      $set: {
        isDeleted: true,
        visibility: LISTING_VISIBILITIES.PRIVATE,
        deletedAt,
        deletedBy: actorId,
        deleteReason: null,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  );

  if (session) {
    deleteQuery = deleteQuery.session(session);
  }

  const listing = await deleteQuery;

  if (!listing) {
    throw new AppError("Listing not found", 404, "LISTING_NOT_FOUND");
  }

  await updateBuildingRentSummaryService(listing.buildingId, session);

  return listing;
};

export const ownerDeleteListingService = async ({
  listingId,
  actorId,
  session = null,
}) => {
  validateNullableObject(session, "session");

  const validatedListingId = validateMongooseId(listingId, "listingId");
  const validatedActorId = validateMongooseId(actorId, "actorId");

  if (session) {
    return deleteOwnerListing({
      listingId: validatedListingId,
      actorId: validatedActorId,
      session,
    });
  }

  const transactionSession = await mongoose.startSession();

  try {
    let listing;

    await transactionSession.withTransaction(async () => {
      listing = await deleteOwnerListing({
        listingId: validatedListingId,
        actorId: validatedActorId,
        session: transactionSession,
      });
    });

    return listing;
  } finally {
    await transactionSession.endSession();
  }
};
