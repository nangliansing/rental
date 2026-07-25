// shared/validators/url.validators.js
import { AppError } from "../errors/app-error.js";

export const validateUrl = (
    input,
    fieldName,
    {
        required = false,
        max = 2000,
        allowedProtocols = ["https:"],
    } = {}
) => {
    if (input == null) {
        if (required) {
            throw new AppError(`${fieldName} is required`, 422, "VALIDATION_ERROR");
        }

        return null;
    }

    if (typeof input !== "string") {
        throw new AppError(`${fieldName} must be a string`, 422, "VALIDATION_ERROR");
    }

    const trimmed = input.trim();

    if (!trimmed) {
        if (required) {
            throw new AppError(`${fieldName} is required`, 422, "VALIDATION_ERROR");
        }

        return null;
    }

    if (!Number.isInteger(max) || max < 1) {
        throw new AppError("max must be a positive integer", 500, "INTERNAL_ERROR");
    }

    if (trimmed.length > max) {
        throw new AppError(
            `${fieldName} must be at most ${max} characters`,
            422,
            "VALIDATION_ERROR"
        );
    }

    let url;

    try {
        url = new URL(trimmed);
    } catch {
        throw new AppError(`${fieldName} must be a valid URL`, 422, "VALIDATION_ERROR");
    }

    if (!allowedProtocols.includes(url.protocol)) {
        throw new AppError(
            `${fieldName} must use ${allowedProtocols.join(" or ")}`,
            422,
            "VALIDATION_ERROR"
        );
    }

    return trimmed;
};