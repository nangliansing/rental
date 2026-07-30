import { validateNullableObject } from "../../../shared/validators/index.js";

import { attachIsFollowingToBuilding } from "./resolve-is-following.js";

const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const enrichListingWithBuildingFollowState = async ({
  listing,
  viewerUserId = null,
  session = null,
}) => {
  validateNullableObject(session, "session");

  if (!isRecord(listing)) {
    return listing;
  }

  if (listing.building == null) {
    return listing;
  }

  return {
    ...listing,
    building: await attachIsFollowingToBuilding({
      building: listing.building,
      viewerUserId,
      session,
    }),
  };
};

export const enrichListingsWithBuildingFollowState = async ({
  listings,
  viewerUserId = null,
  session = null,
}) => {
  validateNullableObject(session, "session");

  if (!Array.isArray(listings)) {
    return listings;
  }

  return Promise.all(
    listings.map((listing) =>
      enrichListingWithBuildingFollowState({
        listing,
        viewerUserId,
        session,
      }),
    ),
  );
};
