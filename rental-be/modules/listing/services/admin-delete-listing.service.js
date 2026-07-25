// modules/listing/services/admin-delete-listing.service.js
import mongoose from "mongoose";

import {
    validateMongooseId,
    validateNullableObject,
    validateObject,
    validateAdminReason,
} from "../../../shared/validators/index.js";

import { AppError } from "../../../shared/errors/app-error.js";
import { updateBuildingRentSummaryService } from "../../building/services/index.js";
import Building from "../../building/building.model.js";
import { createAndEmitNotification } from "../../notification/services/index.js";
import {
    NOTIFICATION_ENTITY_TYPES,
    NOTIFICATION_TYPES,
} from "../../notification/notification.constants.js";
import { emitNotificationToUser } from "../../../shared/socket/index.js";
import { LISTING_VISIBILITIES } from "../listing.constants.js";
import Listing from "../listing.model.js";

const formatCompactBaht = (value) => {
    if (typeof value !== "number") return "listing";

    if (value >= 1000) {
        const compactValue = value / 1000;
        const formattedValue = Number.isInteger(compactValue)
            ? compactValue.toFixed(0)
            : compactValue.toFixed(1);

        return `฿${formattedValue}k listing`;
    }

    return `฿${value.toLocaleString()} listing`;
};

const buildListingLabel = ({ listing, building }) => {
    const priceLabel = formatCompactBaht(listing.rent);
    const buildingName = building?.name?.trim();

    if (buildingName) {
        return `listing at ${buildingName}`;
    }

    return priceLabel;
};

const buildPublicReasonSentence = (deleteReason) => {
    const punctuation = /[.!?]$/.test(deleteReason) ? "" : ".";

    return ` Reason: ${deleteReason}${punctuation}`;
};

const buildAdminDeletedListingNotification = ({
    listing,
    building,
    deletedBy,
    deleteReason,
}) => {
    const listingId = listing._id.toString();
    const buildingId = listing.buildingId.toString();
    const listingLabel = buildListingLabel({ listing, building });

    return {
        recipient: listing.listedBy,
        actor: deletedBy,
        type: NOTIFICATION_TYPES.LISTING_DELETED,
        title: "Listing removed",
        message: `Your ${listingLabel} was removed after moderation.${buildPublicReasonSentence(deleteReason)}`,
        entityType: NOTIFICATION_ENTITY_TYPES.LISTING,
        entityId: listing._id,
        link: "/profile",
        metadata: {
            listingId,
            buildingId,
            listingLabel,
            reason: deleteReason,
        },
    };
};

const deleteListing = async ({ listingId, deletedBy, deleteReason, session }) => {
    const existingListing = await Listing.findOne({
        _id: listingId,
        isDeleted: { $ne: true },
    }).session(session);

    if (!existingListing) {
        throw new AppError("Listing not found", 404, "LISTING_NOT_FOUND");
    }

    const building = await Building.findById(existingListing.buildingId)
        .select("name")
        .session(session)
        .lean();
    const deletedAt = new Date();

    const listing = await Listing.findOneAndUpdate(
        {
            _id: existingListing._id,
            isDeleted: { $ne: true },
        },
        {
            $set: {
                isDeleted: true,
                visibility: LISTING_VISIBILITIES.PRIVATE,
                deletedAt,
                deletedBy,
                deleteReason,
            },
        },
        {
            returnDocument: "after",
            runValidators: true,
            session,
        }
    );

    if (!listing) {
        throw new AppError("Listing not found", 404, "LISTING_NOT_FOUND");
    }

    await updateBuildingRentSummaryService(existingListing.buildingId, session);

    const notification = await createAndEmitNotification(
        buildAdminDeletedListingNotification({
            listing: existingListing,
            building,
            deletedBy,
            deleteReason,
        }),
        { session, emit: false }
    );

    return {
        listing,
        notification,
    };
};

const validateAdminDeleteListingBody = (body) => {
    const validatedBody = validateObject(body, "body");

    return {
        reason: validateAdminReason(validatedBody.reason),
    };
};

export const adminDeleteListingService = async ({
    listingId,
    actorId,
    body,
    session = null,
}) => {
    validateNullableObject(session, "session");

    const validatedListingId = validateMongooseId(listingId, "listingId");
    const deletedBy = validateMongooseId(actorId, "deletedBy");
    const { reason: deleteReason } = validateAdminDeleteListingBody(body);

    if (session) {
        const { listing, notification } = await deleteListing({
            listingId: validatedListingId,
            deletedBy,
            deleteReason,
            session,
        });

        if (!session.inTransaction?.()) {
            emitNotificationToUser(notification.recipient.toString(), notification);
        }

        return listing;
    }

    const transactionSession = await mongoose.startSession();

    try {
        let listing;
        let notification;

        await transactionSession.withTransaction(async () => {
            const result = await deleteListing({
                listingId: validatedListingId,
                deletedBy,
                deleteReason,
                session: transactionSession,
            });

            listing = result.listing;
            notification = result.notification;
        });

        if (notification) {
            emitNotificationToUser(notification.recipient.toString(), notification);
        }

        return listing;
    } finally {
        await transactionSession.endSession();
    }
};
