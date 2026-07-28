// modules/search/filters/build-search-listing-filters.js
import {
    validateContractMonths,
    validateOccupancy,
    validateIsForeignerAccepted,
    validateIsTM30Provided,
    validateBedroomCount,
    validateBathroomCount,
    validateKitchenType,
    validateIsCookingAllowed,
    validateIsPetAllowed,
    validateFacilities as validateListingFacilities,
    validateRent,
    validateAvailableBy,
} from "../../listing/listing.validation.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { setArrayIfNotEmpty } from "./helpers/index.js";

export const buildSearchListingFilters = (body) => {
    const filters = {};

    if (body.minRent !== undefined) {
        filters.minRent = validateRent(body.minRent);
    }

    if (body.maxRent !== undefined) {
        filters.maxRent = validateRent(body.maxRent);

        if (filters.minRent !== undefined && filters.maxRent < filters.minRent) {
            throw new AppError(
                "maxRent must be greater than or equal to minRent",
                422,
                "VALIDATION_ERROR"
            );
        }
    }

    if (body.contractMonths !== undefined) {
        filters.contractMonths = validateContractMonths(body.contractMonths);
    }

    if (body.occupancy !== undefined) {
        filters.occupancy = validateOccupancy(body.occupancy);
    }

    if (body.isForeignerAccepted !== undefined) {
        filters.isForeignerAccepted = validateIsForeignerAccepted(
            body.isForeignerAccepted
        );
    }

    if (body.isTM30Provided !== undefined) {
        filters.isTM30Provided = validateIsTM30Provided(body.isTM30Provided);
    }

    if (body.bedroomCount !== undefined) {
        filters.bedroomCount = validateBedroomCount(body.bedroomCount);
    }

    if (body.bathroomCount !== undefined) {
        filters.bathroomCount = validateBathroomCount(body.bathroomCount);
    }

    if (body.kitchenType !== undefined) {
        filters.kitchenType = validateKitchenType(body.kitchenType);
    }

    if (body.isCookingAllowed !== undefined) {
        filters.isCookingAllowed = validateIsCookingAllowed(body.isCookingAllowed);
    }

    if (body.isPetAllowed !== undefined) {
        filters.isPetAllowed = validateIsPetAllowed(body.isPetAllowed);
    }

    if (body.listingFacilities !== undefined) {
        setArrayIfNotEmpty(
            filters,
            "listingFacilities",
            validateListingFacilities(body.listingFacilities)
        );
    }

    // omitted/null => no date filter; valid date => room must be available by that day
    if (body.availableBy !== undefined && body.availableBy !== null) {
        filters.availableBy = validateAvailableBy(body.availableBy);
    }

    return filters;
};