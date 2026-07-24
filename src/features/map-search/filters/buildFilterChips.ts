import type { FilterChip, MapSearchFilters } from "./types"

const formatRent = (value: number) => {
    if (value >= 1000) {
        return `฿${Math.round(value / 1000)}k`
    }

    return `฿${value}`
}

const formatMonth = (value: number) => {
    return value === 1 ? "1 month" : `${value} months`
}

const formatPeople = (value: number) => {
    return value === 1 ? "1 person" : `${value} people`
}

const formatBedrooms = (value: number) => {
    if (value === 0) return "Studio"

    return value === 1 ? "1+ bed" : `${value}+ beds`
}

const formatBathrooms = (value: number) => {
    return value === 1 ? "1+ bath" : `${value}+ baths`
}

export function buildFilterChips(filters: MapSearchFilters): FilterChip[] {
    const chips: FilterChip[] = []

    if (filters.minRent !== undefined || filters.maxRent !== undefined) {
        const min = filters.minRent !== undefined ? formatRent(filters.minRent) : "Any"
        const max = filters.maxRent !== undefined ? formatRent(filters.maxRent) : "Any"

        chips.push({
            key: "rent",
            label: `${min} - ${max}`,
            icon: "price",
        })
    }

    filters.supportLanguages?.forEach((language) => {
        chips.push({
            key: `supportLanguages:${language}`,
            label: language,
            icon: "language",
        })
    })

    if (filters.buildingType !== undefined) {
        chips.push({
            key: "buildingType",
            label: filters.buildingType,
            icon: "building",
        })
    }

    if (filters.bedroomCount !== undefined) {
        chips.push({
            key: "bedroomCount",
            label: formatBedrooms(filters.bedroomCount),
            icon: "bed",
        })
    }

    if (filters.bathroomCount !== undefined) {
        chips.push({
            key: "bathroomCount",
            label: formatBathrooms(filters.bathroomCount),
            icon: "bath",
        })
    }

    if (filters.kitchenType !== undefined) {
        chips.push({
            key: "kitchenType",
            label: filters.kitchenType,
        })
    }

    if (filters.contractMonths !== undefined) {
        chips.push({
            key: "contractMonths",
            label: formatMonth(filters.contractMonths),
            icon: "contract",
        })
    }

    if (filters.occupancy !== undefined) {
        chips.push({
            key: "occupancy",
            label: formatPeople(filters.occupancy),
            icon: "occupancy",
        })
    }

    if (filters.isForeignerAccepted === true) {
        chips.push({
            key: "isForeignerAccepted",
            label: "Foreigner accepted",
        })
    }

    if (filters.isTM30Provided === true) {
        chips.push({
            key: "isTM30Provided",
            label: "TM30",
            icon: "tm30",
        })
    }

    if (filters.isCookingAllowed === true) {
        chips.push({
            key: "isCookingAllowed",
            label: "Cooking",
            icon: "cooking",
        })
    }

    if (filters.isPetAllowed === true) {
        chips.push({
            key: "isPetAllowed",
            label: "Pet allowed",
            icon: "pet",
        })
    }

    filters.listingFacilities?.forEach((facility) => {
        chips.push({
            key: `listingFacilities:${facility}`,
            label: facility,
            icon: facility === "Air Conditioner" ? "aircon" : undefined,
        })
    })

    filters.buildingFacilities?.forEach((facility) => {
        chips.push({
            key: `buildingFacilities:${facility}`,
            label: facility,
            icon: "building",
        })
    })

    filters.security?.forEach((security) => {
        chips.push({
            key: `security:${security}`,
            label: security,
            icon: "security",
        })
    })

    return chips
}
