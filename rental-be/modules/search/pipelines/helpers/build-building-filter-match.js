// Done
// modules/search/pipelines/helpers/build-building-filter-match.js
export const buildBuildingFilterMatch = (filters = {}) => {
    const match = {
        isActive: true,
    };

    if (filters.buildingType !== undefined) {
        match.buildingType = filters.buildingType;
    }

    if (filters.buildingFacilities !== undefined) {
        match.facilities = { $all: filters.buildingFacilities };
    }

    if (filters.security !== undefined) {
        match.security = { $all: filters.security };
    }

    return match;
};