const OPTIONAL_ARRAY_FILTERS = [
  "listingFacilities",
  "buildingFacilities",
  "security",
  "supportLanguages",
];

export const omitEmptyArrayFilters = (filters = {}) => {
  const normalized = { ...filters };

  for (const field of OPTIONAL_ARRAY_FILTERS) {
    if (Array.isArray(normalized[field]) && normalized[field].length === 0) {
      delete normalized[field];
    }
  }

  return normalized;
};
