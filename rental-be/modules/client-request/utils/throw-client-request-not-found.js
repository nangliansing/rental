import { AppError } from "../../../shared/errors/app-error.js";

export const throwClientRequestNotFound = () => {
  throw new AppError(
    "Client request not found",
    404,
    "CLIENT_REQUEST_NOT_FOUND",
  );
};
