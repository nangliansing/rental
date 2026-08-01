import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from "../../notification/notification.constants.js";
import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../building-follow-notify.constants.js";
import { truncateNotificationText } from "./truncate-notification-text.js";

const formatRent = (rent) => {
  if (typeof rent !== "number" || !Number.isFinite(rent)) {
    return null;
  }

  return `${rent.toLocaleString("en-US")} THB/month`;
};

const resolveBuildingName = (buildingName) => {
  if (typeof buildingName === "string" && buildingName.trim().length > 0) {
    return buildingName.trim();
  }

  return "a building you follow";
};

const formatListingCountLabel = (count, singular, plural) =>
  count === 1 ? `1 ${singular}` : `${count} ${plural}`;

export const buildFollowerNotificationContent = ({ event, listings = [] }) => {
  const buildingId = event.buildingId.toString();
  const buildingName = resolveBuildingName(event.metadata?.buildingName);
  const buildingLink = `/buildings/${buildingId}`;

  switch (event.changeType) {
    case BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED: {
      const oldRentLabel = formatRent(event.metadata.oldMinRent);
      const newRentLabel = formatRent(event.metadata.newMinRent);

      return {
        type: NOTIFICATION_TYPES.FOLLOWED_BUILDING_PRICE_DROPPED,
        title: truncateNotificationText(`Rent dropped at ${buildingName}`, 120),
        message: truncateNotificationText(
          oldRentLabel && newRentLabel
            ? `Minimum rent at ${buildingName} dropped from ${oldRentLabel} to ${newRentLabel}.`
            : `Minimum rent at ${buildingName} has dropped.`,
          500,
        ),
        entityType: NOTIFICATION_ENTITY_TYPES.BUILDING,
        entityId: buildingId,
        link: buildingLink,
        metadata: {
          buildingId,
          buildingName,
          oldMinRent: event.metadata.oldMinRent,
          newMinRent: event.metadata.newMinRent,
          changeType: event.changeType,
        },
      };
    }

    case BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING: {
      const listingCount = listings.length;
      const primaryListing = listings[0];
      const listingIds = listings.map((listing) => listing.listingId.toString());
      const rentLabel = formatRent(primaryListing?.rent);

      if (listingCount === 1) {
        const listingId = primaryListing.listingId.toString();

        return {
          type: NOTIFICATION_TYPES.FOLLOWED_BUILDING_NEW_LISTING,
          title: truncateNotificationText(`New listing at ${buildingName}`, 120),
          message: truncateNotificationText(
            rentLabel
              ? `A new listing is available at ${buildingName} from ${rentLabel}.`
              : `A new listing is available at ${buildingName}.`,
            500,
          ),
          entityType: NOTIFICATION_ENTITY_TYPES.LISTING,
          entityId: listingId,
          link: `/listings/${listingId}`,
          metadata: {
            buildingId,
            buildingName,
            listingId,
            listingIds,
            listingCount,
            rent: primaryListing.rent,
            availableAt: primaryListing.availableAt,
            changeType: event.changeType,
          },
        };
      }

      const countLabel = formatListingCountLabel(
        listingCount,
        "new listing",
        "new listings",
      );

      return {
        type: NOTIFICATION_TYPES.FOLLOWED_BUILDING_NEW_LISTING,
        title: truncateNotificationText(`${countLabel} at ${buildingName}`, 120),
        message: truncateNotificationText(
          `${countLabel} are now available at ${buildingName}.`,
          500,
        ),
        entityType: NOTIFICATION_ENTITY_TYPES.BUILDING,
        entityId: buildingId,
        link: buildingLink,
        metadata: {
          buildingId,
          buildingName,
          listingIds,
          listingCount,
          changeType: event.changeType,
        },
      };
    }

    case BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN: {
      const listingCount = listings.length;
      const primaryListing = listings[0];
      const listingIds = listings.map((listing) => listing.listingId.toString());
      const rentLabel = formatRent(primaryListing?.rent);

      if (listingCount === 1) {
        const listingId = primaryListing.listingId.toString();

        return {
          type: NOTIFICATION_TYPES.FOLLOWED_BUILDING_AVAILABLE_AGAIN,
          title: truncateNotificationText(`Listing available at ${buildingName}`, 120),
          message: truncateNotificationText(
            rentLabel
              ? `A listing at ${buildingName} is available again from ${rentLabel}.`
              : `A listing at ${buildingName} is available again.`,
            500,
          ),
          entityType: NOTIFICATION_ENTITY_TYPES.LISTING,
          entityId: listingId,
          link: `/listings/${listingId}`,
          metadata: {
            buildingId,
            buildingName,
            listingId,
            listingIds,
            listingCount,
            rent: primaryListing.rent,
            availableAt: primaryListing.availableAt,
            becamePublic: primaryListing.becamePublic,
            availabilityChanged: primaryListing.availabilityChanged,
            changeType: event.changeType,
          },
        };
      }

      const countLabel = formatListingCountLabel(
        listingCount,
        "listing",
        "listings",
      );

      return {
        type: NOTIFICATION_TYPES.FOLLOWED_BUILDING_AVAILABLE_AGAIN,
        title: truncateNotificationText(`${countLabel} available at ${buildingName}`, 120),
        message: truncateNotificationText(
          `${countLabel} at ${buildingName} are available again.`,
          500,
        ),
        entityType: NOTIFICATION_ENTITY_TYPES.BUILDING,
        entityId: buildingId,
        link: buildingLink,
        metadata: {
          buildingId,
          buildingName,
          listingIds,
          listingCount,
          changeType: event.changeType,
        },
      };
    }

    default:
      throw new Error(`Unsupported follower change type: ${event.changeType}`);
  }
};
