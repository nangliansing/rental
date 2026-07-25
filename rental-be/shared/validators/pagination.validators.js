// shared/validators/pagination.validators.js
import { AppError } from "../errors/app-error.js";
import { validateNumberRange } from "./number.validators.js";

export const validatePaginationNumber = (
    input,
    fieldName,
    defaultValue,
    min,
    max
) => {
    const normalizedInput =
        typeof input === "string" && input.trim() !== ""
            ? Number(input)
            : input;

    const value =
        normalizedInput == null || normalizedInput === ""
            ? defaultValue
            : validateNumberRange(normalizedInput, fieldName, min, max);

    if (!Number.isInteger(value)) {
        throw new AppError(
            `${fieldName} must be an integer`,
            422,
            "VALIDATION_ERROR"
        );
    }

    return value;
};

export const validatePage = (input) => {
    return validatePaginationNumber(input, "page", 1, 1, 10000);
};

export const validateLimit = (input) => {
    return validatePaginationNumber(input, "limit", 20, 1, 100);
};