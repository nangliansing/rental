export const ACTIVE_BUILDING_FILTER = Object.freeze({
  isActive: true,
});

export const PUBLIC_BUILDING_DETAIL_SELECT = [
  "name",
  "buildingType",
  "facilities",
  "security",
  "location",
  "address",
  "minRent",
  "maxRent",
  "createdAt",
  "updatedAt",
].join(" ");
