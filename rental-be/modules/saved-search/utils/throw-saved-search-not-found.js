import { AppError } from "../../../shared/errors/app-error.js";

export const throwSavedSearchNotFound = () => {
  throw new AppError(
    "Saved search not found",
    404,
    "SAVED_SEARCH_NOT_FOUND",
  );
};
