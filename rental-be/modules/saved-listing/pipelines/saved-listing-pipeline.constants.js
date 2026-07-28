import { LISTING_DETAILS_MONGO_PROJECT } from "../../listing/constants/listing-details.projection.js";

export const SAVED_LISTING_SORT = Object.freeze({
  createdAt: -1,
  _id: -1,
});

export const LIVE_SAVED_LISTING_PROJECT = Object.freeze({
  _id: 1,
  ...LISTING_DETAILS_MONGO_PROJECT,
  isDeleted: 1,
  listedBy: 1,
  buildingId: 1,
  building: 1,
  agentProfile: 1,
  createdAt: 1,
  updatedAt: 1,
});

export const SEARCH_SAVED_LISTING_PROJECT = Object.freeze({
  _id: 1,
  listingId: 1,
  buildingId: 1,
  listedBy: 1,
  snapshot: 1,
  listing: 1,
  createdAt: 1,
  updatedAt: 1,
});
