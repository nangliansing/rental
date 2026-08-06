import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";

import SavedSearch from "../saved-search.model.js";
import {
  buildOwnerSavedSearchFilter,
  throwSavedSearchNotFound,
} from "../utils/index.js";

export const ownerSearchSavedSearchByIdService = async ({
  savedSearchId,
  actorId,
  session = null,
}) => {
  validateNullableObject(session, "session");

  const validatedSavedSearchId = validateMongooseId(
    savedSearchId,
    "savedSearchId",
  );
  const validatedActorId = validateMongooseId(actorId, "actorId");

  const ownerFilter = buildOwnerSavedSearchFilter({
    savedSearchId: validatedSavedSearchId,
    actorId: validatedActorId,
  });

  let savedSearchQuery = SavedSearch.findOne(ownerFilter);

  if (session) {
    savedSearchQuery = savedSearchQuery.session(session);
  }

  const savedSearch = await savedSearchQuery;

  if (!savedSearch) {
    throwSavedSearchNotFound();
  }

  return savedSearch;
};
