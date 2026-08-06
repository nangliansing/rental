import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";

import { SAVED_SEARCH_STATUSES } from "../saved-search.constants.js";
import { buildOwnerUpdateSavedSearchRecord } from "../mappers/index.js";
import SavedSearch from "../saved-search.model.js";
import {
  buildOwnerSavedSearchFilter,
  throwSavedSearchClosed,
  throwSavedSearchNotFound,
  withSavedSearchCoverage,
} from "../utils/index.js";

export const ownerUpdateSavedSearchService = async ({
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

  const ownerFilter = buildOwnerSavedSearchFilter({
    savedSearchId: validatedSavedSearchId,
    actorId: validatedActorId,
  });

  let existingQuery = SavedSearch.findOne(ownerFilter);

  if (session) {
    existingQuery = existingQuery.session(session);
  }

  const existingSavedSearch = await existingQuery;

  if (!existingSavedSearch) {
    throwSavedSearchNotFound();
  }

  if (existingSavedSearch.status === SAVED_SEARCH_STATUSES.CLOSED) {
    throwSavedSearchClosed();
  }

  const update = buildOwnerUpdateSavedSearchRecord({
    body,
    savedSearch: existingSavedSearch,
  });

  if (update.geoSearch) {
    update.geoSearch = withSavedSearchCoverage(update.geoSearch);
  }

  const updateFilter = {
    ...ownerFilter,
    status: SAVED_SEARCH_STATUSES.WAITING,
  };

  let updateQuery = SavedSearch.findOneAndUpdate(
    updateFilter,
    { $set: update },
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
