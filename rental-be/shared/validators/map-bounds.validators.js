// shared/validators/map-bounds.validators.js
import { AppError } from "../errors/app-error.js";

const ensureExactKeys = (input, fieldName, allowedKeys) => {
    const keys = Object.keys(input);

    const hasExactLength = keys.length === allowedKeys.length;
    const hasAllRequiredKeys = allowedKeys.every((key) => keys.includes(key));

    if (!hasExactLength || !hasAllRequiredKeys) {
        throw new AppError(
            `${fieldName} must contain exactly: ${allowedKeys.join(", ")}`,
            422,
            "VALIDATION_ERROR"
        );
    }
};

const validateLatLngPoint = (input, fieldName) => {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw new AppError(`${fieldName} must be an object`, 422, "VALIDATION_ERROR");
    }

    ensureExactKeys(input, fieldName, ["lat", "lng"]);

    if (!Number.isFinite(input.lat) || input.lat < -90 || input.lat > 90) {
        throw new AppError(
            `${fieldName}.lat must be a valid latitude`,
            422,
            "VALIDATION_ERROR"
        );
    }

    if (!Number.isFinite(input.lng) || input.lng < -180 || input.lng > 180) {
        throw new AppError(
            `${fieldName}.lng must be a valid longitude`,
            422,
            "VALIDATION_ERROR"
        );
    }

    return {
        lat: input.lat,
        lng: input.lng,
    };
};

export const validateMapBounds = (input, fieldName = "bounds") => {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw new AppError(`${fieldName} must be an object`, 422, "VALIDATION_ERROR");
    }

    ensureExactKeys(input, fieldName, ["northEast", "southWest"]);

    const northEast = validateLatLngPoint(input.northEast, `${fieldName}.northEast`);
    const southWest = validateLatLngPoint(input.southWest, `${fieldName}.southWest`);

    if (northEast.lat <= southWest.lat) {
        throw new AppError(
            `${fieldName}.northEast.lat must be greater than ${fieldName}.southWest.lat`,
            422,
            "VALIDATION_ERROR"
        );
    }

    if (northEast.lng <= southWest.lng) {
        throw new AppError(
            `${fieldName}.northEast.lng must be greater than ${fieldName}.southWest.lng`,
            422,
            "VALIDATION_ERROR"
        );
    }

    return {
        northEast,
        southWest,
    };
};