import { listingDetailsSchemaDefinition } from "../schemas/index.js";

/** Mongo `$project` fields derived from listing details schema (DRY with model). */
export const LISTING_DETAILS_MONGO_PROJECT = Object.freeze(
  Object.fromEntries(
    Object.keys(listingDetailsSchemaDefinition).map((field) => [field, 1]),
  ),
);
