import { AppError } from "../../../shared/errors/app-error.js";

export const throwSavedSearchClosed = () => {
  throw new AppError(
    "Closed saved searches cannot be updated",
    409,
    "SAVED_SEARCH_CLOSED",
  );
};
