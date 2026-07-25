import { AppError } from "../errors/app-error.js";

export const validatePassword = (
    input,
    fieldName = "password",
    options = {}
) => {
    const {
        required = true,
        min = 8,
        max = 72,
        requireUppercase = false,
        requireLowercase = false,
        requireNumber = false,
        requireSymbol = false,
    } = options;

    if (input == null) {
        if (!required) return null;

        throw new AppError(`${fieldName} is required`, 422, "VALIDATION_ERROR");
    }

    if (typeof input !== "string") {
        throw new AppError(`${fieldName} must be a string`, 422, "VALIDATION_ERROR");
    }

    const password = input.trim();

    if (!password) {
        if (!required) return null;

        throw new AppError(`${fieldName} is required`, 422, "VALIDATION_ERROR");
    }

    if (password.length < min) {
        throw new AppError(
            `${fieldName} must be at least ${min} characters`,
            422,
            "VALIDATION_ERROR"
        );
    }

    if (password.length > max) {
        throw new AppError(
            `${fieldName} must be at most ${max} characters`,
            422,
            "VALIDATION_ERROR"
        );
    }

    if (requireUppercase && !/[A-Z]/.test(password)) {
        throw new AppError(`${fieldName} must contain an uppercase letter`, 422, "VALIDATION_ERROR");
    }

    if (requireLowercase && !/[a-z]/.test(password)) {
        throw new AppError(`${fieldName} must contain a lowercase letter`, 422, "VALIDATION_ERROR");
    }

    if (requireNumber && !/\d/.test(password)) {
        throw new AppError(`${fieldName} must contain a number`, 422, "VALIDATION_ERROR");
    }

    if (requireSymbol && !/[^A-Za-z0-9]/.test(password)) {
        throw new AppError(`${fieldName} must contain a symbol`, 422, "VALIDATION_ERROR");
    }

    return password;
};