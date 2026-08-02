import { listingDetailsSchemaDefinition } from "../schemas/index.js";

/** Fields stored on listing details but never exposed via public projections. */
export const LISTING_DETAILS_OWNER_ONLY_FIELDS = Object.freeze([
  "privateNote",
]);

const LISTING_DETAILS_PUBLIC_FIELDS = Object.freeze(
  Object.keys(listingDetailsSchemaDefinition).filter(
    (field) => !LISTING_DETAILS_OWNER_ONLY_FIELDS.includes(field),
  ),
);

/** Mongo `$project` fields derived from public listing details schema fields. */
export const LISTING_DETAILS_MONGO_PROJECT = Object.freeze(
  Object.fromEntries(
    LISTING_DETAILS_PUBLIC_FIELDS.map((field) => [field, 1]),
  ),
);

/** Owner-only `$project` fields appended on authenticated owner detail reads. */
export const LISTING_OWNER_ONLY_MONGO_PROJECT = Object.freeze({
  privateNote: 1,
});
