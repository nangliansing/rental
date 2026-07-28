import type { FilterChip, MapSearchFilters } from "./types"

function removeArrayValue(values: string[] | undefined, value: string) {
    const nextValues = values?.filter((item) => item !== value)

    return nextValues && nextValues.length > 0 ? nextValues : undefined
}

export function removeFilterChip(
    filters: MapSearchFilters,
    chip: FilterChip
): MapSearchFilters {
    const nextFilters = { ...filters }

    if (chip.key === "rent") {
        delete nextFilters.minRent
        delete nextFilters.maxRent
        return nextFilters
    }

    if (chip.key === "buildingType") {
        delete nextFilters.buildingType
        return nextFilters
    }

    if (chip.key === "contractMonths") {
        delete nextFilters.contractMonths
        return nextFilters
    }

    if (chip.key === "occupancy") {
        delete nextFilters.occupancy
        return nextFilters
    }

    if (chip.key === "bedroomCount") {
        delete nextFilters.bedroomCount
        return nextFilters
    }

    if (chip.key === "bathroomCount") {
        delete nextFilters.bathroomCount
        return nextFilters
    }

    if (chip.key === "kitchenType") {
        delete nextFilters.kitchenType
        return nextFilters
    }

    if (chip.key === "isForeignerAccepted") {
        delete nextFilters.isForeignerAccepted
        return nextFilters
    }

    if (chip.key === "isTM30Provided") {
        delete nextFilters.isTM30Provided
        return nextFilters
    }

    if (chip.key === "isCookingAllowed") {
        delete nextFilters.isCookingAllowed
        return nextFilters
    }

    if (chip.key === "isPetAllowed") {
        delete nextFilters.isPetAllowed
        return nextFilters
    }

    if (chip.key === "availableBy") {
        delete nextFilters.availableBy
        return nextFilters
    }

    if (chip.key.startsWith("listingFacilities:")) {
        const facility = chip.key.replace("listingFacilities:", "")
        nextFilters.listingFacilities = removeArrayValue(
            nextFilters.listingFacilities,
            facility
        )
        return nextFilters
    }

    if (chip.key.startsWith("buildingFacilities:")) {
        const facility = chip.key.replace("buildingFacilities:", "")
        nextFilters.buildingFacilities = removeArrayValue(
            nextFilters.buildingFacilities,
            facility
        )
        return nextFilters
    }

    if (chip.key.startsWith("security:")) {
        const security = chip.key.replace("security:", "")
        nextFilters.security = removeArrayValue(nextFilters.security, security)
        return nextFilters
    }

    if (chip.key.startsWith("supportLanguages:")) {
        const language = chip.key.replace("supportLanguages:", "")
        nextFilters.supportLanguages = removeArrayValue(
            nextFilters.supportLanguages,
            language
        )
        return nextFilters
    }

    if (chip.key === "agentProfileIds" || chip.key === "listerIds") {
        delete nextFilters.agentProfileIds
        delete nextFilters.listerIds
        return nextFilters
    }

    return nextFilters
}
