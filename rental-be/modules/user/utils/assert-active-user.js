import { AppError } from "../../../shared/errors/app-error.js";
import { USER_STATUSES } from "../user.constants.js";

export const assertActiveUser = (
  user,
  {
    notFoundMessage = "User not found",
    notFoundCode = "USER_NOT_FOUND",
    notFoundStatusCode = 404,
    inactiveMessage = "Account is inactive",
    inactiveCode = "ACCOUNT_INACTIVE",
    suspendedMessage = "Account is suspended",
    suspendedCode = "ACCOUNT_SUSPENDED",
    unknownStatusMessage = "Account is not active",
    unknownStatusCode = "ACCOUNT_NOT_ACTIVE",
  } = {}
) => {
  if (!user) {
    throw new AppError(notFoundMessage, notFoundStatusCode, notFoundCode);
  }

  if (user.status === USER_STATUSES.ACTIVE) {
    return;
  }

  if (user.status === USER_STATUSES.INACTIVE) {
    throw new AppError(inactiveMessage, 403, inactiveCode);
  }

  if (user.status === USER_STATUSES.SUSPENDED) {
    throw new AppError(suspendedMessage, 403, suspendedCode);
  }

  throw new AppError(unknownStatusMessage, 403, unknownStatusCode);
};
