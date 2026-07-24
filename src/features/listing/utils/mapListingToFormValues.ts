import type { OwnerListing } from "../api"
import type { ListingFormValues } from "../components/ListingForm"

export function mapListingToFormValues(
  listing: OwnerListing,
): ListingFormValues {
  return {
    visibility: listing.visibility,
    isForeignerAccepted: listing.isForeignerAccepted,
    isTM30Provided: listing.isTM30Provided,
    rent: listing.rent,
    deposit: listing.deposit,
    moveInCost: listing.moveInCost,
    electricRate: listing.electricRate,
    waterRate: listing.waterRate,
    bedroomCount: listing.bedroomCount,
    bathroomCount: listing.bathroomCount,
    kitchenType: listing.kitchenType,
    size: listing.size,
    contractMonths: listing.contractMonths,
    occupancy: listing.occupancy,
    isCookingAllowed: listing.isCookingAllowed,
    isPetAllowed: listing.isPetAllowed,
    facilities: Array.isArray(listing.facilities) ? listing.facilities : [],
    media: Array.isArray(listing.media)
      ? listing.media.map((media, index) => ({
          publicId: media.publicId,
          secureUrl: media.secureUrl,
          resourceType: media.resourceType ?? "image",
          format: media.format ?? null,
          width: media.width ?? null,
          height: media.height ?? null,
          bytes: media.bytes ?? null,
          position: media.position ?? index,
          alt: media.alt ?? null,
          isCover: media.isCover ?? false,
        }))
      : [],
    description: listing.description ?? "",
  }
}
