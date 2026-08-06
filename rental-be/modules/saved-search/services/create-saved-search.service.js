import { validateNullableObject } from "../../../shared/validators/index.js";

import { buildCreateSavedSearchRecord } from "../mappers/index.js";
import SavedSearch from "../saved-search.model.js";

export const createSavedSearchService = async (
  body,
  actorId,
  session = null,
) => {
  validateNullableObject(session, "session");

  const record = buildCreateSavedSearchRecord(body, actorId);

  const [savedSearch] = await SavedSearch.create(
    [record],
    session ? { session } : undefined,
  );

  return savedSearch;
};
