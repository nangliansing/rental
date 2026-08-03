import { AppError } from "../../../shared/errors/app-error.js";

export const throwClientRequestClosed = () => {
  throw new AppError(
    "Closed client requests cannot be updated",
    409,
    "CLIENT_REQUEST_CLOSED",
  );
};
