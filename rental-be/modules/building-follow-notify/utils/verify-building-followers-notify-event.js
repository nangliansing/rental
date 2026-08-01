import Building from "../../building/building.model.js";
import Listing from "../../listing/listing.model.js";
import { LISTING_VISIBILITIES } from "../../listing/listing.constants.js";
import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../building-follow-notify.constants.js";
import { detectBuildingPriceDrop } from "../detectors/detect-building-price-drop.js";
import { isNotifyEligibleListing } from "./is-notify-eligible-listing.js";
import { isListingAvailableNow } from "./listing-availability-state.js";

const loadEligibleListings = async (buildingId, listings) => {
  if (!Array.isArray(listings) || listings.length === 0) {
    return [];
  }

  const listingIds = listings.map((listing) => listing.listingId);
  const documents = await Listing.find({
    _id: { $in: listingIds },
    buildingId,
    isDeleted: false,
    visibility: LISTING_VISIBILITIES.PUBLIC,
  })
    .select("_id rent availableAt visibility")
    .lean();

  const documentsById = new Map(
    documents.map((document) => [document._id.toString(), document]),
  );

  return listings
    .map((listing) => {
      const document = documentsById.get(listing.listingId.toString());

      if (!document || !isNotifyEligibleListing(document)) {
        return null;
      }

      return {
        ...listing,
        rent:
          typeof document.rent === "number" && Number.isFinite(document.rent)
            ? document.rent
            : listing.rent,
        availableAt: document.availableAt ?? listing.availableAt ?? null,
        becamePublic: document.visibility === LISTING_VISIBILITIES.PUBLIC,
        availabilityChanged: listing.availabilityChanged === true,
      };
    })
    .filter(Boolean);
};

const isBuildingActive = async (buildingId) => {
  const building = await Building.findById(buildingId)
    .select("isActive")
    .lean();

  return Boolean(building && building.isActive !== false);
};

export const isPriceDropFollowerNotifyStillValid = async (event) => {
  const building = await Building.findById(event.buildingId)
    .select("minRent isActive")
    .lean();

  if (!building || building.isActive === false) {
    return false;
  }

  const currentMinRent = building.minRent;
  const { oldMinRent, newMinRent } = event.metadata;

  if (
    typeof currentMinRent === "number" &&
    Number.isFinite(currentMinRent) &&
    typeof newMinRent === "number" &&
    Number.isFinite(newMinRent) &&
    currentMinRent <= newMinRent
  ) {
    return true;
  }

  return Boolean(
    detectBuildingPriceDrop({
      oldMinRent,
      newMinRent: currentMinRent,
    }),
  );
};

export const isNewListingFollowerNotifyStillValid = async (event) => {
  if (!(await isBuildingActive(event.buildingId))) {
    return false;
  }

  const eligibleListings = await loadEligibleListings(
    event.buildingId,
    event.listings,
  );

  return eligibleListings.length > 0;
};

export const isAvailableAgainFollowerNotifyStillValid = async (event) => {
  if (!(await isBuildingActive(event.buildingId))) {
    return false;
  }

  const eligibleListings = await loadEligibleListings(
    event.buildingId,
    event.listings,
  );

  return eligibleListings.some(
    (listing) =>
      listing.becamePublic === true ||
      listing.availabilityChanged === true ||
      isListingAvailableNow(listing.availableAt),
  );
};

/** @deprecated Prefer type-specific validators. */
export const isBuildingFollowersNotifyEventStillValid = async (event) => {
  switch (event.changeType) {
    case BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED:
      return isPriceDropFollowerNotifyStillValid(event);

    case BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING:
      return isNewListingFollowerNotifyStillValid(event);

    case BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN:
      return isAvailableAgainFollowerNotifyStillValid(event);

    default:
      return false;
  }
};

export const resolveBuildingNameForFollowerNotify = async (event) => {
  if (event.metadata?.buildingName) {
    return event.metadata.buildingName;
  }

  const building = await Building.findById(event.buildingId).select("name").lean();

  return building?.name ?? null;
};

export const refreshListingBatchMetadata = async (event) => {
  if (
    event.changeType !== BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING &&
    event.changeType !== BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN
  ) {
    return event.listings;
  }

  return loadEligibleListings(event.buildingId, event.listings);
};

export const refreshPriceDropMetadata = async (event) => {
  const building = await Building.findById(event.buildingId)
    .select("minRent")
    .lean();

  if (building?.minRent == null) {
    return event.metadata;
  }

  return {
    ...event.metadata,
    newMinRent: building.minRent,
  };
};
