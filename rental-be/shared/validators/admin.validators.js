import { AppError } from "../errors/app-error.js";
import { validateRequiredString } from "./string.validators.js";

export const validateAdminReason = (input) => {
    if (input == null) {
        throw new AppError("reason is required", 422, "VALIDATION_ERROR");
    }

    return validateRequiredString(input, "reason", 500);
};