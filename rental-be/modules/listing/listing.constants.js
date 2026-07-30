// modules/listing/listing.constants.js
export const KITCHEN_TYPES = Object.freeze({
    NO_KITCHEN: "No Kitchen",
    KITCHEN: "Kitchen",
    SEPARATE_KITCHEN: "Separate Kitchen",
});

export const LISTING_FACILITIES = Object.freeze({
    WIFI: "Wifi",
    TV: "TV",
    AIR_CONDITIONER: "Air Conditioner",
    FAN: "Fan",
    REFRIGERATOR: "Refrigerator",
    MICROWAVE: "Microwave",
    WASHING_MACHINE: "Washing Machine",
    WATER_HEATER: "Water Heater",
    DESK: "Desk",
    CHAIR: "Chair",
    WARDROBE: "Wardrobe",
    BED: "Bed",
    SOFA: "Sofa",
    BALCONY: "Balcony",
    PRIVATE_BATHROOM: "Private Bathroom",
    COOKING_EQUIPMENT: "Cooking Equipment",
});

export const LISTING_VISIBILITIES = Object.freeze({
    PUBLIC: "PUBLIC",
    PRIVATE: "PRIVATE",
});

export const OWNER_LISTING_VISIBILITY_FILTERS = Object.freeze({
    ALL: "ALL",
    PUBLIC: LISTING_VISIBILITIES.PUBLIC,
    PRIVATE: LISTING_VISIBILITIES.PRIVATE,
});

export const OWNER_LISTING_FILTERS = Object.freeze({
    ALL: "all",
    NOW: "now",
    SOON: "soon",
    PRIVATE: "private",
});

export const OWNER_LISTING_SORTS = Object.freeze({
    LATEST: "latest",
    OLDEST: "oldest",
});
