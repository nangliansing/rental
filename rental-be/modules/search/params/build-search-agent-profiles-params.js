// modules/search/params/build-search-agent-profiles-params.js
import { AppError } from "../../../shared/errors/app-error.js";
import {
    validateLimit,
    validateObject,
    validateRequiredString,
} from "../../../shared/validators/index.js";

export const buildSearchAgentProfilesParams = (queryInput) => {
    validateObject(queryInput, "query");

    if (queryInput.query == null) {
        throw new AppError("query is required", 422, "VALIDATION_ERROR");
    }

    const query = validateRequiredString(queryInput.query, "query", 80);

    if (query.length < 2) {
        throw new AppError(
            "query must be at least 2 characters",
            422,
            "VALIDATION_ERROR"
        );
    }

    return {
        query,
        limit: validateLimit(queryInput.limit),
    };
};
