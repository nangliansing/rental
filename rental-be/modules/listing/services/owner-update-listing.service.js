import mongoose from "mongoose";

import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";

import { AppError } from "../../../shared/errors/app-error.js";
import Building from "../../building/building.model.js";
import { updateBuildingRentSummaryService } from "../../building/services/index.js";
import {
  maybeEnqueueBuildingFollowerAvailableAgain,
  maybeEnqueueBuildingFollowerPriceDrop,
} from "../../building-follow-notify/services/enqueue-building-followers-notify.service.js";
import { buildOwnerUpdateListingRecord } from "../mappers/index.js";
import Listing from "../listing.model.js";
import { serializeListingDocumentForApi } from "../utils/index.js";

const updateOwnerListing = async ({ listingId, actorId, body, session, logger }) => {
  const ownerListingFilter = {
    _id: listingId,
    listedBy: actorId,
    isDeleted: false,
  };

  let existingQuery = Listing.findOne(ownerListingFilter).select("+privateNote");

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

  let previousMinRent = null;
  let currentMinRent = null;
  let buildingName = null;

  if (Object.hasOwn(update, "rent") || Object.hasOwn(update, "visibility")) {
    const building = await Building.findById(listing.buildingId)
      .select("minRent name")
      .session(session ?? null)
      .lean();

    previousMinRent = building?.minRent ?? null;
    buildingName = building?.name ?? null;

    const updatedBuilding = await updateBuildingRentSummaryService(
      listing.buildingId,
      session,
      { logger },
    );

    currentMinRent = updatedBuilding?.minRent ?? null;
    buildingName = updatedBuilding?.name ?? buildingName;
  } else {
    const building = await Building.findById(listing.buildingId)
      .select("name")
      .session(session ?? null)
      .lean();

    buildingName = building?.name ?? null;
  }

  return {
    listing: serializeListingDocumentForApi(listing),
    sideEffects: {
      existingListing,
      updatedListing: listing,
      buildingName,
      previousMinRent,
      currentMinRent,
    },
  };
};

const runOwnerUpdateSideEffects = async (sideEffects, { logger } = {}) => {
  if (!sideEffects) return;

  const {
    existingListing,
    updatedListing,
    buildingName,
    previousMinRent,
    currentMinRent,
  } = sideEffects;

  await maybeEnqueueBuildingFollowerAvailableAgain({
    before: existingListing,
    after: updatedListing,
    buildingName,
    occurredAt: new Date(),
    logger,
  });

  if (previousMinRent != null || currentMinRent != null) {
    await maybeEnqueueBuildingFollowerPriceDrop({
      buildingId: updatedListing.buildingId,
      buildingName,
      oldMinRent: previousMinRent,
      newMinRent: currentMinRent,
      occurredAt: new Date(),
      logger,
    });
  }
};

export const ownerUpdateListingService = async ({
  listingId,
  body,
  actorId,
  session = null,
  logger = null,
}) => {
  validateNullableObject(session, "session");

  const validatedListingId = validateMongooseId(listingId, "listingId");
  const validatedActorId = validateMongooseId(actorId, "actorId");

  if (session) {
    const { listing, sideEffects } = await updateOwnerListing({
      listingId: validatedListingId,
      actorId: validatedActorId,
      body,
      session,
      logger,
    });

    if (!session.inTransaction?.()) {
      await runOwnerUpdateSideEffects(sideEffects, { logger });
    }

    return listing;
  }

  const transactionSession = await mongoose.startSession();

  try {
    let listing;
    let sideEffects;

    await transactionSession.withTransaction(async () => {
      const result = await updateOwnerListing({
        listingId: validatedListingId,
        actorId: validatedActorId,
        body,
        session: transactionSession,
        logger,
      });

      listing = result.listing;
      sideEffects = result.sideEffects;
    });

    await runOwnerUpdateSideEffects(sideEffects, { logger });

    return listing;
  } finally {
    await transactionSession.endSession();
  }
};
