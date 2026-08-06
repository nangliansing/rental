import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";

import { SAVED_SEARCH_STATUSES } from "../saved-search.constants.js";
import { validateOwnerUpdateSavedSearchStatusBody } from "../saved-search.validation.js";
import SavedSearch from "../saved-search.model.js";
import {
  buildOwnerSavedSearchFilter,
  throwSavedSearchClosed,
  throwSavedSearchNotFound,
} from "../utils/index.js";

export const ownerUpdateSavedSearchStatusService = async ({
  savedSearchId,
  body,
  actorId,
  session = null,
}) => {
  validateNullableObject(session, "session");

  const validatedSavedSearchId = validateMongooseId(
    savedSearchId,
    "savedSearchId",
  );
  const validatedActorId = validateMongooseId(actorId, "actorId");
  const { status } = validateOwnerUpdateSavedSearchStatusBody(body);

  const ownerFilter = buildOwnerSavedSearchFilter({
    savedSearchId: validatedSavedSearchId,
    actorId: validatedActorId,
  });

  const updateFilter = {
    ...ownerFilter,
    status: SAVED_SEARCH_STATUSES.WAITING,
  };

  let updateQuery = SavedSearch.findOneAndUpdate(
    updateFilter,
    {
      $set: {
        status,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  );

  if (session) {
    updateQuery = updateQuery.session(session);
  }

  const savedSearch = await updateQuery;

  if (!savedSearch) {
    let raceQuery = SavedSearch.findOne(ownerFilter);

    if (session) {
      raceQuery = raceQuery.session(session);
    }

    const racedSavedSearch = await raceQuery;

    if (racedSavedSearch?.status === SAVED_SEARCH_STATUSES.CLOSED) {
      throwSavedSearchClosed();
    }

    throwSavedSearchNotFound();
  }

  return savedSearch;
};
