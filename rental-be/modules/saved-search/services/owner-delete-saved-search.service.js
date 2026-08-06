import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";

import SavedSearch from "../saved-search.model.js";
import {
  buildOwnerSavedSearchFilter,
  throwSavedSearchNotFound,
} from "../utils/index.js";

export const ownerDeleteSavedSearchService = async ({
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
  const deletedAt = new Date();

  const ownerFilter = buildOwnerSavedSearchFilter({
    savedSearchId: validatedSavedSearchId,
    actorId: validatedActorId,
  });

  let deleteQuery = SavedSearch.findOneAndUpdate(
    ownerFilter,
    {
      $set: {
        isDeleted: true,
        deletedAt,
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

  const savedSearch = await deleteQuery;

  if (!savedSearch) {
    throwSavedSearchNotFound();
  }

  return savedSearch;
};
